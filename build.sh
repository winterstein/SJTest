
echo "This script assumes you have a winterwell setup!"
# Useful script for updating the jdoc, Winterwell web files etc.

jsdoc SJTest.js
yuicompressor -o SJTest.min.js SJTest.js
cp SJTest.min.js ~/winterwell/code/creole/web/static/code/lib/
rm -rf ~/winterwell/www/software/sjtest/out
cp -R out ~/winterwell/www/software/sjtest/out
