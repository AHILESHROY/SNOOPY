import os
import time
import random
import re
import psycopg2
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jsonpath_ng import parse
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
                cur.execute("SELECT u_id, link FROM products WHERE platform = 'flipkart';")
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

    def fetch_buffer_data(self):
        self.connect()
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT u_id, link FROM update_buffer WHERE platform = 'flipkart';")
                rows = cur.fetchall()
                return rows
        except psycopg2.Error as e:
            print(f"❌ Error fetching buffer data: {e}")
            return []

    def insert_into_products(self, data):
        if not data:
            print("⚠️ No data to insert.")
            return

        try:
            conn = psycopg2.connect(
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                port=DB_PORT
            )
            conn.autocommit = False

            query_insert = """
            INSERT INTO products (u_id, link, product_name, platform, image_url)
            VALUES (%s, %s, %s, 'flipkart', %s);
            """
            query_delete = """
            DELETE FROM update_buffer WHERE u_id = %s;
            """

            print(data)
            with conn.cursor() as cur:
                cur.executemany(query_insert, data)

                u_ids = [row[0] for row in data]
                delete_data = [(u_id,) for u_id in u_ids]
                cur.executemany(query_delete, delete_data)

            conn.commit()
            print("✅ Transaction committed.")

        except psycopg2.Error as e:
            print(f"❌ Error during transaction: {e}")
            conn.rollback()
            print("🔁 Transaction rolled back.")
        finally:
            conn.close()

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

class FlipkartSpider(scrapy.Spider):
    name = 'flipkart_product'
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
                meta={"uid": uid,
                      "url" : url},
            )

    def parse(self, response):
        uid = response.meta["uid"]
        print("UID:", uid)
        url = response.meta["url"]

        # Extract product name
        product_name = response.css('span.VU-ZEz::text').get()
        if not product_name:
            failures.append(uid)
            return

        if uid in actual:
            print("grabbing image")
            image_url = response.css('meta[property="og:image"]::attr(content)').get()
            self.db.insert_into_products([(uid, url, product_name, image_url)])
            return
            

        # Extract current price
        price_text = response.xpath('//div[contains(@class, "Nx9bqj")]/text()').get()

        if price_text:
            price = float(re.sub(r'[^\d.]', '', price_text))
        else:
            price = None


        # Extract original price 
        original_price = None
        original_price_texts = response.xpath('//div[contains(@class, "yRaY8j")]/text()').getall()

        for text in original_price_texts:
            match = re.findall(r'[\d,]+(?:\.\d+)?', text)
            if match:
                original_price = float(match[0].replace(',', ''))
                break

        if original_price is None:
            original_price = price

        # Extract rating
        rating = response.xpath('//div[@class="XQDdHH"]/text()').get()
        if rating:
            rating = rating.strip()
        else:
            rating = 0

        # Extract number of ratings
        rating_number = response.xpath('//span[contains(text(), "Ratings")]/text()').get()
        if rating_number:
            rating_number = ''.join(filter(str.isdigit, rating_number))
        else:
            rating_number = 0

        # Calculate discount rate
        discount_rate = 0
        if original_price and price and original_price > price:
            discount_rate = ((original_price - price) / original_price) * 100
        
        print(uid, price, original_price, f"{discount_rate:.1f}%", rating, rating_number)
        #print(self.scraped_data)

        image_url = response.css('meta[property="og:image"]::attr(content)').get()
    
        # Check if the URL is found
        if image_url:
            print(f"Found image: {image_url}")
        else:
            print("Image URL not found")

        self.scraped_data.append((uid, price, original_price, f"{discount_rate:.1f}%", rating, rating_number))
        
        for budget in self.budgets:
            if budget[1] == uid and price < budget[2]:
                send_email(budget[0], product_name, price, budget[2])
        
    def closed(self, reason):
        print(self.scraped_data)
        #self.db.insert_data_bulk(self.scraped_data)

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
    buffers = db.fetch_buffer_data()
    print(buffers)
    global actual
    actual = [item[0] for item in buffers]
    pl = product_links + buffers

    if not pl:
        return {"status": "error", "message": "No product links found."}
    
    configure_logging({'LOG_LEVEL': 'NOTSET'})
    runner = CrawlerRunner()

    def crawl(retries=8):
        d = runner.crawl(FlipkartSpider, product_links=pl, db=db, budgets=budgets)
        d.addCallback(lambda _: retry_failed(retries))
        d.addBoth(lambda _: reactor.stop())

    def retry_failed(retries_left):
        if retries_left > 0 and failures:
            print(f"🔄 Retrying failed URLs ({retries_left} retries left)...")
            retry = [(x, y) for x, y in product_links if x in failures]
            failures.clear()
            d = runner.crawl(FlipkartSpider, product_links=retry, db=db, budgets=budgets)
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
