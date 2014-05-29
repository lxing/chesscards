from flask import Flask, request
# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='', static_folder='')

@app.route('/')
def root():
  return app.send_static_file('index.html')

import os
@app.route('/js/<path:path>')
def static_js(path):
  return app.send_static_file(os.path.join('js', path))

@app.route('/css/<path:path>')
def static_css(path):
  return app.send_static_file(os.path.join('css', path))

@app.route('/img/<path:path>')
def static_img(path):
  return app.send_static_file(os.path.join('img', path))

if __name__ == '__main__':
  app.run(debug=True)
  print app.send_static_file('index.html')