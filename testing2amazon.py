import os
import time
import random
import re
import psycopg2
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import scrapy
from scrapy.crawler import CrawlerRunner
from scrapy.utils.log import configure_logging
from twisted.internet import reactor

DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "Aadhav123!"
DB_HOST = "snoopy-primary.c5ema6oo0wwy.ap-south-1.rds.amazonaws.com"
DB_PORT = "5432"
SENDER_EMAIL = "neighborhoodsnoopy@gmail.com"
SENDER_PASSWORD = 'jkxpyglhafmimyma'

class SQLManager:
    def __init__(self):
        self.current_date = time.strftime("%Y-%m-%d")
        self.conn = None

    def connect(self, retries=3):
        for attempt in range(1, retries + 1):
            try:
                self.conn = psycopg2.connect(
                    dbname=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD,
                    host=DB_HOST,
                    port=DB_PORT
                )
                print("✅ Database connection established.")
                return
            except Exception as e:
                print(f"❌ Attempt {attempt}: Database connection failed - {e}")
                time.sleep(2)
        raise Exception("🚨 All attempts to connect to the database failed.")

    def fetch_product_links(self):
        self.connect()
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT u_id, link FROM products WHERE platform = 'amazonin';")
                rows = cur.fetchall()
                return rows
        except psycopg2.Error as e:
            print(f"❌ Error fetching product links: {e}")
            return []

    def fetch_alert_data(self):
        self.connect()
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT user_email, u_id, value FROM budgets;")
                rows = cur.fetchall()
                return rows
        except psycopg2.Error as e:
            print(f"❌ Error fetching budget data: {e}")
            return []

    def insert_data_bulk(self, data):
        if not data:
            print("⚠️ No data to insert.")
            return

        self.connect()
        query = """
        INSERT INTO prices (u_id, record_date, price, original_price, discount_rate, ratings, number_of_ratings)
        VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s);
        """
        try:
            with self.conn.cursor() as cur:
                cur.executemany(query, data)
                self.conn.commit()
        except psycopg2.Error as e:
            print(f"Error inserting data: {e}")

    def close(self):
        if self.conn:
            try:
                self.conn.close()
            except psycopg2.Error as e:
                print(f"⚠️ Error closing database connection: {e}")
        
failures = []
other = []
class AmazonINSpider(scrapy.Spider):
    name = 'amazon_product'
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:31.0) Gecko/20100101 Firefox/31.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.81',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux i686; rv:124.0) Gecko/20100101 Firefox/124.0',
    ]

    def __init__(self, product_links, db, budgets, scraped_data_shared, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.product_links = product_links
        self.db = db
        self.budgets = budgets
        self.scraped_data_shared = scraped_data_shared  # <-- Shared external list

    def start_requests(self):
        for uid, url in self.product_links:
            yield scrapy.Request(
                url,
                callback=self.parse,
                headers={"User-Agent": random.choice(self.user_agents)},
                meta={"uid": uid},
            )

    def parse(self, response):
        uid = response.meta["uid"]
        #print(uid)

        # Extract product name
        product_name = response.xpath('//span[@id="productTitle"]//text()').getall()
        if product_name:
            product_name = ' '.join([text.strip() for text in product_name if text.strip()])
        else:
            product_name = "Product name not found"
            failures.append(uid)
            print(f"{uid} not found. Adding to retries.")
            other.append(uid)
            return

        # Extract current price
        price = response.css('span.a-price-whole::text').get()
        if price:
            price = float(price.strip().replace(',', ''))
        else:
            price = None  # Handle cases where no price is found

        # Extract original price (M.R.P.)
        original_price = None
        original_price_texts = response.xpath('//*[contains(text(),"M.R.P.")]/text()').getall()

        for text in original_price_texts:
            match = re.findall(r'[\d,]+(?:\.\d+)?', text)  # Extract numbers
            if match:
                original_price = float(match[0].replace(',', ''))  # Convert to float
                break  # Stop after finding the first valid price

        # If no original price is found, assume it's the same as the current price
        if original_price is None:
            original_price = price

        # Extract rating
        rating = response.css('span.a-size-base.a-color-base::text').get()
        if rating:
            rating = rating.strip()
        else:
            rating = "Rating not found"
        if rating == '&':
            rating = 3.5

        # Extract number of ratings
        rating_number = response.css('span#acrCustomerReviewText.a-size-base::text').get()
        if rating_number:
            rating_number = ''.join(filter(str.isdigit, rating_number))
        else:
            rating_number = "Number of ratings not found"

        # Calculate discount rate (only if original_price and price are valid)
        discount_rate = 0
        if original_price and price and original_price > price:
            discount_rate = ((original_price - price) / original_price) * 100

        print(uid, price, original_price, f"{discount_rate:.1f}%", rating, rating_number)
        self.scraped_data_shared.append((uid, price, original_price, f"{discount_rate:.1f}%", rating, rating_number))
        print(f"[After scraping UID {uid}] Total scraped so far: {len(self.scraped_data_shared)}")


        # Extract primary image URL
        image_url = response.xpath('//img[@id="landingImage"]/@src').get()
        if not image_url:
            if dynamic_image_data:
                try:
                    import json
                    # Ensure valid JSON format
                    image_dict = json.loads(dynamic_image_data.replace("'", '"'))
                    
                    # Select the image URL with the largest area (width * height)
                    image_url = max(image_dict, key=lambda k: image_dict[k][0] * image_dict[k][1])
                except Exception as e:
                    print(f"Error parsing image URL for UID {uid}: {e}")
                    image_url = "Image not found"
            else:
                primary_image_url = "Image not found"

        print(uid, image_url)
    
        '''for budget in self.budgets:
            if budget[1] == uid and price < budget[2]:
                send_email(budget[0], product_name, price, budget[2])'''
        
    def closed(self, reason):
        pass

def send_email(user_email, product_name, scraped_price, budget_price):
    sender_email = SENDER_EMAIL
    sender_password = SENDER_PASSWORD
    subject = f"Price Alert for {product_name}"
    body = f"""
    The price for {product_name} has dropped below your budget!

    Current Price: ${scraped_price:.2f}
    Your Budget: ${budget_price:.2f}

    Visit the product page to grab the deal!
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = user_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, user_email, msg.as_string())
        print(f"📧 Email sent to {user_email}")
    except Exception as e:
        print(f"❌ Error sending email: {e}")

def lambda_handler(event, context):
    db = SQLManager()
    product_links = db.fetch_product_links()
    budgets = db.fetch_alert_data()
    scraped_data_shared2 = []  # <-- Shared list across retries

    if not product_links:
        return {"status": "error", "message": "No product links found."}
    
    configure_logging({'LOG_LEVEL': 'CRITICAL'})
    runner = CrawlerRunner()

    def crawl(retries=8):
        d = runner.crawl(AmazonINSpider, product_links=product_links, db=db, budgets=budgets, scraped_data_shared=scraped_data_shared2)
        d.addCallback(lambda _: retry_failed(retries))
        d.addBoth(lambda _: reactor.stop())

    def retry_failed(retries_left):
        if retries_left > 0 and failures:
            print(f"🔄 Retrying failed URLs ({retries_left} retries left)...")
            retry = [(x, y) for x, y in product_links if x in failures]
            failures.clear()
            d = runner.crawl(AmazonINSpider, product_links=retry, db=db, budgets=budgets, scraped_data_shared=scraped_data_shared2)
            d.addCallback(lambda _: retry_failed(retries_left - 1))
            return d
        else:
            print("✅ All retries completed.")
            #print(scraped_data_shared2)
            raw = []
            for i in scraped_data_shared2:
                raw.append(i[0])
            raw2 = set(raw)
            test = set(other)
            common = raw2 & test
            print("IDs that failed but were picked up on following retries: ", list(common))
            print("IDs that failed completely: ", list(test-common))
            
            db.insert_data_bulk(scraped_data_shared2)  # <-- Insert once, at the end
            return None

    crawl()
    reactor.run()
    db.close()

    return {"status": "success", "message": "Scraping completed."}

if __name__ == "__main__":
    lambda_handler(None, None)
