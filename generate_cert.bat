winpty openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
winpty openssl rsa -in key.pem -out key-rsa.pem