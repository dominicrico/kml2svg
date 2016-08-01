[![NPM](https://nodei.co/npm/kml2svg.png)](https://nodei.co/npm/kml2svg/)

##Installation
Use the node package manager (npm) for easy installation.

```
npm install --save kml2svg
```
**or**

```
npm install -g kml2svg
```

##Usage

###CLI
To convert a Google Maps route
```
kml2svg https://www.google.com/maps/dir/50.4525038,6.9169664/50.4431304,6.9153357/@50.4478022,6.9122579,16z    
```

To convert a KML file
```
kml2svg path/to/kml/file.kml
```
###Programmable

```
var kml2svg = require('kml2svg');

//for a GoogleMaps route
var svgObj = kml2svg('https://www.google.com/maps/dir/50.4525038,6.9169664/50.4431304,6.9153357/@50.4478022,6.9122579,16z');

//for a .kml file
var svgObj = kml2svg('path/to/kml/file.kml');


//returns a html document with the svg path of your route
/*
  <!DOCTYPE html>
  <html>
    <head>
    </head>
    <body>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="212.8814109365011" width="106.3017331125162" viewBox="-2.5 -2.5 106.3017331125162 212.8814109365011">
        <g id="map" transform="rotate(180, 50.6508665562581,103.94070546825056)">
          <polyline id="track" class="poly" data-name="track" points="4.830509784202408,195.51328977553717 ..." style="fill:transparent;stroke:#999;stroke-width:3" />
        </g>
      </svg>
    </body>
  </html>
*/
```
