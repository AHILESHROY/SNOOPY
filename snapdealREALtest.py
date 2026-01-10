import os
import time
import random
import re
import psycopg2
import smtplib
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

failures = []

class SQLManager:
    def __init__(self):
        self.current_date = time.strftime("%Y-%m-%d")
        self.conn = None

    def connect(self):
        if self.conn is None or self.conn.closed != 0:
            try:
                self.conn = psycopg2.connect(
                    dbname=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD,
                    host=DB_HOST,
                    port=DB_PORT
                )
            except Exception as e:
                print(f"❌ Database connection failed: {e}")

    def fetch_product_links(self):
        self.connect()
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT u_id, link FROM products WHERE platform = 'snapdeal';")
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

class SnapdealSpider(scrapy.Spider):
    name = 'snapdeal_product'
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

    def __init__(self, product_links, db, budgets, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.product_links = product_links
        self.db = db
        self.budgets = budgets
        self.scraped_data = []

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

        # Extract Name
        product_name = response.xpath('//h1[@itemprop="name"]/text()').get()
        if not product_name:
            product_name = response.xpath('//h1/@title').get()
        if product_name:
            product_name = product_name.strip()
        else:
            failures.append(uid)
            
        # Extract Price
        price = response.xpath('//span[@class="payBlkBig"]/text()').get()
        if price:
            price = float(price.replace('₹', '').replace(',', '').strip())

        # Extract Original Price
        original_price_text = response.xpath('//div[contains(@class, "pdpCutPrice")]//text()').getall()

        if original_price_text:
            original_price_text = ' '.join(original_price_text).strip()
            match = re.search(r'Rs\.\s*([\d,]+)', original_price_text)
            
            if match:
                original_price = float(match.group(1).replace(',', ''))
            else:
                original_price = price
                
        else:
            original_price = price

        # Extract Rating
        rating = response.xpath('//span[@class="avrg-rating"]/text()').get()
        if rating:
            rating = rating.strip().replace('(','').replace(')',"")

        # Extract Number of Ratings
        rating_number = response.xpath('//span[@class="total-rating showRatingTooltip"]/text()').get()
        if rating_number:
            rating_number = ''.join(filter(str.isdigit, rating_number))

        # Calculate Discount Rate
        discount_rate = round(((original_price - price) / original_price) * 100, 2) if original_price else 0

        self.scraped_data.append((uid, price, original_price, f"{discount_rate:.1f}%", rating, rating_number))
        
        for budget in self.budgets:
            if budget[1] == uid and price < budget[2]:
                send_email(budget[0], product_name, price, budget[2])
        
    def closed(self, reason):
        self.db.insert_data_bulk(self.scraped_data)

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

    if not product_links:
        return {"status": "error", "message": "No product links found."}
    
    configure_logging({'LOG_LEVEL': 'NOTSET'})
    runner = CrawlerRunner()

    def crawl(retries=8):
        d = runner.crawl(SnapdealSpider, product_links=product_links, db=db, budgets=budgets)
        d.addCallback(lambda _: retry_failed(retries))
        d.addBoth(lambda _: reactor.stop())

    def retry_failed(retries_left):
        if retries_left > 0 and failures:
            print(f"🔄 Retrying failed URLs ({retries_left} retries left)...")
            retry = [(x, y) for x, y in product_links if x in failures]
            failures.clear()
            d = runner.crawl(SnapdealSpider, product_links=retry, db=db, budgets=budgets)
            d.addCallback(lambda _: retry_failed(retries_left - 1))
            return d
        else:
            print("✅ All retries completed.")
            return None

    crawl()
    reactor.run()
    db.close()

    return {"status": "success", "message": "Scraping completed."}

if __name__ == "__main__":
    lambda_handler(None, None)
