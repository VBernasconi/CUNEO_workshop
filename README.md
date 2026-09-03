## MAP website
To visualize your data it works with the google colab thing
- Takes as an input the .gpkg file (this type of extension can also be used by QGIS which might be convenient for other uses)
- Takes as an input a folder of images listed in the .gpkg file
- Run in local with the following command ` python3 -m http.server 8000 --bind 0.0.0.0` and don't forget in you browser to actually use the URL http://localhost:8000/ to access the images and everything
- The project uses maptile - DON'T FORGET THE API KEY 'TO BE REMOVED IF PLACED ON A GITHUB REPOSITORY'
