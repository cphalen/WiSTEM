import time
import shutil
import os
import redis
THREE_DAY_WAIT_TIME = 259200

def copy():
    if not os.path.isdir("backlog"):
        os.mkdir("backlog")

    shutil.copy("./dump.rdb", "./backlog/" + time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime()) + ".rdb")

def save():
    db = redis.Redis("localhost")
    db.save()

while True:
    try:
        save()
        copy()
        time.sleep(THREE_DAY_WAIT_TIME)
    except:
        pass
