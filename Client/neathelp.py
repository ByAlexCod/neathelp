import argparse
import glob
import os
import string
from getpass import getpass
import random
import hashlib
import requests
from os import path
import zipfile
import json

api_url = "http://localhost:3000/api/"


def main():
    if not check_login():
        print("It seems like you are not logged in. What do you want to do ? (l = login, r = register, v = verify "
              "account)")
        res = input()
        if res.capitalize() == "R":
            register()
        elif res.capitalize() == "L":
            login()
        else:
            verify_otp()

    parser = argparse.ArgumentParser(description='Neathelp')

    # Add the arguments
    parser.add_argument('-p', '--paths',
                        type=str,
                        help='the paths to include in the help card',
                        default="none")

    parser.add_argument('-a', '--answer',
                        type=bool,
                        help='Is it a answer to a card',
                        default=False)

    parser.add_argument('-c', '--card',
                        type=str,
                        help='the card id',
                        default="none")
    args = parser.parse_args()

    if args.paths != "none":
        path_list = [str(item) for item in args.paths.split(',')]
        if args.answer:
            zip_path = os.path.join("./", random_string() + ".zip")
            zip_file = zipfile.ZipFile(zip_path, 'w')
            with zip_file:
                zipdir(args.paths, zip_file)

            create_proposition(zip_path, args.card)
        else:
            get_help(path_list)
    else:
        answer = 0
        while answer != 5:
            answer = int(input("What do you want to do?\n"
                               "0) Get help\n"
                               "1) Help\n"
                               "2) Help requests\n"
                               "3) Send help\n"
                               "4) Disconnect\n"
                               "5) Quit\n"))
            if answer == 0:
                get_help()
            elif answer == 1:
                help()
            elif answer == 2:
                print_requests()

def zipdir(path, ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk(path):
        for file in files:
            ziph.write(os.path.join(root, file))

def print_requests():
    print("Cards created: ")
    cards_result = requests.get(api_url + "card", headers={"Authorization": "Bearer " + read_token()})
    print(cards_result.json()["message"])
    i = 0
    for card in cards_result.json()["data"]:
        print(str(i) + ") " + card["title"] + " - " + card["_id"])
        i += 1
    cardIdx = int(input("Input the number of the card you want to see details."))
    get_propositions(cards_result.json()["data"][cardIdx])


def help():
    help_id = input("Help Id: ")
    card_response = requests.get(api_url + "card/" + help_id, headers={"Authorization": "Bearer " + read_token()})
    card_json = card_response.json()
    print(card_json["message"])
    if card_response.status_code != 404:
        print(card_json["data"]["title"])
        print(card_json["data"]["description"])

        if input("Do you want to download the source ? (y/n)") == "y":
            print("location of the source: " + get_source(card_json["data"]["hash"], "./"))


def create_proposition(path, card_id):
    hash = create_source(path)
    description = input("Description: ")
    response = requests.post(api_url + "card/"+card_id+"/proposition", data={
        "description": description,
        "hash": hash
    }, headers={"Authorization": "Bearer " + read_token()})
    print(json.dumps(response.json()))




def get_source(hash, location):
    complete_path = path.join(location, hash + ".zip")
    r = requests.get(api_url + "card/source/" + hash, headers={"Authorization": "Bearer " + read_token()})
    open(complete_path, 'wb').write(r.content)
    return complete_path


def get_propositions(card):
    response = requests.get(api_url + "card/" + card["_id"] + "/proposition",
                            headers={"Authorization": "Bearer " + read_token()})
    response_json = response.json()
    print(response_json["message"])
    if response.status_code != 404:
        i = 0
        for proposition in response_json["data"]:
            print(str(i) + ") " + proposition["username"])

        selection = int(input("Proposition to download: "))

        print("Location of the proposition source: ", get_source(response_json["data"][selection]["hash"], "./"))
        print("Description :" + response_json["data"][selection]["description"])


def get_help(paths, title="", description=""):
    if title == "":
        title = input("Title: ")
    if description == "":
        description = input("Description:\n")

    zip_path = os.path.join("./", random_string() + ".zip")
    zip_file = zipfile.ZipFile(zip_path, 'w')
    with zip_file:
        for path in paths:
            if os.path.isfile(path):
                zip_file.write(path, arcname=os.path.basename(path))
                print("Adding " + path)
            else:
                filePaths = retrieve_file_paths(path)
                print("Adding " + path)
                for fileName in filePaths:
                    print(fileName)
                    for file in filePaths:
                        zip_file.write(file)

    zip_md5 = create_source(zip_path)

    card_res = requests.post(api_url + "card", data={
        "title": title,
        "description": description,
        "hash": zip_md5
    }, headers={"Authorization": "Bearer " + read_token()})

    print("Card creation => " + str(json.dumps(card_res.json())))
    """Create card"""


def create_source(zip_path):
    zip_md5 = md5(zip_path)
    print("Uploading source")
    res = requests.post(api_url + "card/source", files={"zip": open(zip_path, "rb")},
                        headers={"Authorization": "Bearer " + read_token()})
    print("Response => " + res.json()["message"])
    os.remove(zip_path)
    return zip_md5


def random_string(stringLength=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))


def md5(fname):
    hash_md5 = hashlib.md5()
    with open(fname, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def retrieve_file_paths(dirName):
    # setup file paths variable
    filePaths = []

    # Read all directory, subdirectories and file lists
    for root, directories, files in os.walk(dirName):
        for filename in files:
            # Create the full filepath by using os module.
            filePath = os.path.join(root, filename)
            filePaths.append(filePath)

    # return all paths
    return filePaths


def check_login():
    if is_token():
        token = read_token()
        r = requests.get(api_url + "auth/profile", headers={"Authorization": "Bearer " + token})
        if r.status_code != 401:
            return True
    return False


def login():
    """Login"""
    status = 0
    r = {}
    while status != 200:
        email = input("Email: ")
        password = getpass("Password: ")
        r = requests.post(api_url + "auth/login", data={"email": email, "password": password})
        print(r.json()["message"])
        print(r.json())
        status = r.status_code

    user = json.loads(str(json.dumps(r.json()["data"])))
    save_token(user["token"])
    print("Welcome {}".format(user["firstName"]))


def register():
    firstname = input("Firstname / pseudonyme:")
    lastname = input("Lastname or empty:")
    if lastname == "":
        lastname = "_"

    email = input("Email:")
    password = getpass("password")

    r = requests.post(api_url + "auth/register", data={
        "firstName": firstname,
        "lastName": lastname,
        "email": email,
        "password": password
    })

    print(r.json()["message"])
    print("We just sent you an email where you can find a validation code and instructions.")
    verify_otp(email)


def verify_otp(email=""):
    print("Verifying account...")
    if email == "":
        email = input("Email: ")
    code = input("Verification code: \n")
    r = requests.post(api_url + "auth/verify-otp", data={"email": email, "otp": code})


def save_token(token):
    f = open("conf", "w")
    f.write(token)


def read_token():
    f = open("conf", "r")
    return f.read()


def is_token():
    return path.exists("conf")


main()
