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

# Environment variables for sensitive data
##DB_NAME = os.getenv("DB_NAME", "postgres")
##DB_USER = os.getenv("DB_USER", "postgres")
##DB_PASSWORD = os.getenv("DB_PASSWORD", "Aadhav123!")
##DB_HOST = os.getenv("DB_HOST", "snoopy-primary.c5ema6oo0wwy.ap-south-1.rds.amazonaws.com")
##DB_PORT = os.getenv("DB_PORT", "5432")
##SENDER_EMAIL = os.getenv("SENDER_EMAIL", "neighborhoodsnoopy@gmail.com")
##SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "jvjckggqedoabeyf")

DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "Aadhav123!"
DB_HOST = "snoopy-primary.c5ema6oo0wwy.ap-south-1.rds.amazonaws.com"
DB_PORT = "5432"
SENDER_EMAIL = "neighborhoodsnoopy@gmail.com"
SENDER_PASSWORD = 'jvjckggqedoabeyf'

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
                cur.execute("SELECT u_id, link FROM products WHERE platform = 'target';")
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

class TargetSpider(scrapy.Spider):
    name = 'target_product'
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

        # Extract product name
        product_name = response.css('h1[data-test="product-title"]::text').get()
        if not product_name:
            product_name = "Product name not found"
            failures.append(uid)
            
        # Extract Price
        match = re.search(r'TGT_DATA.*?JSON\.parse\("({.*})"\)', response.text, re.DOTALL)

        if match:
            json_str = match.group(1)
            json_str = json_str.encode().decode("unicode_escape")

            try:
                last_brace = json_str.rfind("}")
                json_str = json_str[:last_brace + 1]

                json_data = json.loads(json_str)

                jsonpath_expr = parse("$..price[*]")
                prices = [match.value for match in jsonpath_expr.find(json_data) if isinstance(match.value, dict)]

                price = prices[0].get("current_retail")
                original_price = prices[0].get("reg_retail")
                
            except json.JSONDecodeError as e:
                print("❌ JSON Parsing Error After Cleanup:", e)
        else:
            print("❌ No TGT_DATA match found")

        #Extract Rating and Number of Ratings
        rating_raw = response.xpath('//span[@data-test="ratings"]/span/text()').get()
        match = re.search(r"([\d.]+) out of 5 stars with (\d+) reviews", rating_raw)

        if match:
            rating = float(match.group(1))
            rating_number = int(match.group(2))

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
        d = runner.crawl(TargetSpider, product_links=product_links, db=db, budgets=budgets)
        d.addCallback(lambda _: retry_failed(retries))
        d.addBoth(lambda _: reactor.stop())

    def retry_failed(retries_left):
        if retries_left > 0 and failures:
            print(f"🔄 Retrying failed URLs ({retries_left} retries left)...")
            retry = [(x, y) for x, y in product_links if x in failures]
            failures.clear()
            d = runner.crawl(TargetSpider, product_links=retry, db=db, budgets=budgets)
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
