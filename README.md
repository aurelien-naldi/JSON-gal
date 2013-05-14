JSON Photo gallery
==================

A simple tool to manage static web galleries.
Tons of great web galleries exist, but most use databases and server-side software, which turn out annoying to install and maintain.
After playing with some static web site generators, especially [nikola](http://nikola.ralsina.com.ar),
I wanted to do the same for my photo gallery. I found some tools like [PhotoFloat](http://zx2c4.com/projects/photofloat/)
but I had a different structure in mind and wanted to experiment a bit...

This static generator is pretty small and not fully functional yet. Like PhotoFloat, it has two faces:
* a python script browses your gallery structure, generate thumbnails and JSON files with metadata
* a javascript file loads these JSON files and builds allow the user to use the gallery


Future plans include
* integration with nikola
* geolocalisation tags


How to use it?
--------------

The wgscan.py script provides a few commands:
* help          show this message
* init          create a new gallery
* build         update the gallery

Running without a command will trigger a build.



Licence
-------

This code is available under LGPL v2+/CeCILL-C.


Authors
-------

Aurelien Naldi   
