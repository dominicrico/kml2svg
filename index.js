var parser = require('xml2json');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var http = require('http');

var maxLng = 0;
var maxLat = 0;
var maxAlt = 0;
var minLng = 999999;
var minLat = 999999;
var minAlt = 999999;
var scale = 300;
var correction = 0;

var svgChords = [];

module.exports = function(kml) {
  if (isURL(kml)) {
    request({
      url: 'http://www.gpsvisualizer.com/map?output_googleearth',
      method: 'POST',
      form: {
        drawing_title: 'kml_map',
        units: 'metric',
        remote_data: kml,
        format: 'googleearth',
        add_elevation: 'SRTM1',
        googleearth_zip: 0,
        googleearth_trk_altitude: 'relativeToGround'
      }
    }, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(body);
        var a = $('img[src="http://maps.gpsvisualizer.com/images/kml_icon.gif"]').parent();
        request('http://www.gpsvisualizer.com/' + a.attr('href'), function(error, response, body) {
          if (error) throw new Error(error);
          convert2svg(body);
        });

      }
    });
  } else {
    fs.readFile(kml, 'utf8', function(err, data) {
      if (err) throw err;
      convert2svg(data);
    });
  }
};

function isURL(str) {
   var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
   var url = new RegExp(urlRegex, 'i');
   return str.length < 2083 && url.test(str);
}

function convert2svg(kml) {
  var output = '';
  var parsedKML = JSON.parse(parser.toJson(kml));

  getChordsFromKML(parsedKML.kml.Document.Folder);

  var height = (3963.0 * Math.acos(Math.sin(maxLat/57.2958) * Math.sin(minLat/57.2958) + Math.cos(maxLat/57.2958) * Math.cos(minLat/57.2958) * Math.cos(minLng/57.2958 - minLng/57.2958)));
  var width = (3963.0 * Math.acos(Math.sin(maxLat/57.2958) * Math.sin(maxLat/57.2958) + Math.cos(maxLat/57.2958) * Math.cos(maxLat/57.2958) * Math.cos(maxLng/57.2958 - minLng/57.2958)));
  var uheight=(height*scale)+(height*scale*0.05);
  var uwidth=(width*scale)+(width*scale*0.05);
  var xdiff=height*0.025*scale;
  var ydiff=width*0.025*scale;

  output += "<!DOCTYPE html><html><head><script src='//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js'></script><script>jQuery(document).ready(function(){jQuery('.poly').click(function(event){alert(event.target.attributes['data-name'].nodeValue);})});</script></head><body>";
	output += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="' + (uwidth+10) + '" width="' + (uheight+10) + '" viewBox="-2.5 -2.5 ' + (uheight+10) + ' ' + (uwidth+10) + '"> <g id="map" transform="rotate(180, ' + ((uheight/2)+2.5) + ',' + ((uwidth/2)+2.5) + ')">';
  var points = '';
  var distance = 0;
  var elevation = 0;
  var corr = (maxLat - minLat) + (maxLng - minLng)*9;

  svgChords.forEach(function(chords, i){
    if (i < svgChords.length-1) {
      var d = getDistance(svgChords[i], svgChords[i+1]);
      var e = getElevation(svgChords[i], svgChords[i+1]);
      distance += d;
      elevation += e;
    }

    var y = (3963.0 * Math.acos(Math.sin(maxLat/57.2958) * Math.sin(chords.lat/57.2958) + Math.cos(maxLat/57.2958) * Math.cos(chords.lat/57.2958) *  Math.cos(minLng/57.2958 - minLng/57.2958)));
  	var x = (3963.0 * Math.acos(Math.sin(maxLat/57.2958) * Math.sin(maxLat/57.2958) + Math.cos(maxLat/57.2958) * Math.cos(maxLat/57.2958) *  Math.cos(chords.lng/57.2958 - minLng/57.2958)));
  	var previousX = (x*scale)+xdiff;
  	var previousY = (y*scale)+ydiff;
    points += previousY + ',' + previousX + ' ';
  });
  output += '<polyline id="track" class="poly" data-name="track" points="' + points + '" style="fill:transparent;stroke:#999;stroke-width:3" />';
  output += '</g></svg></body></html>';
  distance = distance - distance*corr;

  console.log({svg: output, distance: distance, grade: (elevation/distance)*100});
  console.log(corr);
  return {svg: output, distance: distance, grade: (elevation/distance)*100};
}

function getChordsFromKML(placemarks) {
  var latLng;
  placemarks.forEach(function(placemark){
    if (placemark.id === 'Tracks') {
      latLng = placemark.Placemark.MultiGeometry.LineString.coordinates.split(' ');
    }
  });

  latLng.forEach(function(chords){
    var lat, lng, alt, chordSplit;
    chordSplit = chords.split(',');
    lat = chordSplit[0];
    lng = chordSplit[1];
    alt = chordSplit[2];

    svgChords.push(checkCords(lng, lat, alt));
  });

  correction = 640;
}

function checkCords(lng, lat, alt)
{
	if(lat > maxLat) maxLat = lat;
	if(lng > maxLng) maxLng = lng;
  if(alt > maxAlt) maxAlt = alt;
	if(lat < minLat) minLat = lat;
	if(lng < minLng) minLng = lng;
  if(alt < minAlt) minAlt = alt;
	return {lat: lat, lng: lng, alt: alt};
}

function getElevation(p1, p2) {
  var e1 = parseFloat(p1.alt);
  var e2 = parseFloat(p2.alt);

  return (e1 - e2);
}

function getDistance(p1, p2) {
  p1.lat = parseFloat(p1.lat);
  p2.lat = parseFloat(p2.lat);
  p1.lng = parseFloat(p1.lng);
  p2.lng = parseFloat(p2.lng);

  var p = (Math.PI / 180);
  var c = Math.cos;
  var a = 0.5 - c((p2.lat - p1.lat) * p)/2 +
          c(p1.lat * p) * c(p2.lat * p) *
          (1 - c((p2.lng - p1.lng) * p))/2;

  distance = ((((6356.8*2)+( 6378.1*2))/2) * Math.asin(Math.sqrt(a)));
  return distance*1000;
}
