#!/usr/bin/python

import os
import sys
import json
import yaml
import time
import imghdr
import shutil
import pyexiv2

# handle either PIL or Pillow
try:
    import Image
except:
    from PIL import Image
from PIL.ExifTags import TAGS


# default thumb sizes, overload with a "sizes" key in gallery.yaml
DEFAULT_SIZES = (
    ("thumb", 200),
    ("view", 1500),
    ("full", 3000),
)

NOGALLERY = "No gallery found here. Use the 'init' command to create one"

"""
Inject a YAML file into an existing property map.
"""
def load_meta(info, metafile):
    if os.path.exists(metafile):
        f = open(metafile)
        meta = yaml.safe_load(f)
        f.close()
        info.update(meta)


"""
Scan an album:
* load metadata
* list images and generate thumbnails
* generate JSON file
* provides core info for the gallery
"""
# TODO: sub-albums
def scan_album(name, source, dest, rebuild=False):
    album_info = {}
    album_info["title"] = name
    album_info["comment"] = ""
    album_ori = os.path.join(source, name)
    load_meta(album_info, os.path.join(album_ori, 'album.yaml'))
    album_info["path"] = name

    output_folder = os.path.join(dest, name)
    if os.path.exists(output_folder):
        print "[SCAN (EXISTING) ALBUM: %s]" % name
        # TODO: load existing metadata, refresh if needed
    else:
        print "[SCAN ALBUM: %s]" % name
        os.mkdir( output_folder)
        os.mkdir( os.path.join(output_folder, "thumbs") ) 
        os.mkdir( os.path.join(output_folder, "large")  ) 
        os.mkdir( os.path.join(output_folder, "full")   ) 

    images = []
    images_info = {}

    for fname in os.listdir(album_ori):
        ori_path = os.path.join(album_ori,fname)
        ori_time = os.path.getmtime(ori_path)
        w = imghdr.what(ori_path)
        if not w: continue
        img_key = fname
        img_info = {}
        img_info["path"] = fname
        img_info["date"] = ori_time

        print "    "+fname
        images.append(img_key)
        images_info[img_key] = img_info

        im = Image.open(ori_path)
        metadata = pyexiv2.ImageMetadata(ori_path)
        metadata.read()
        try:
            dt = metadata['Exif.Image.DateTime'].value
            img_info["date"] = time.mktime( dt.timetuple())
        except: pass

        try:
            # rotate, based on http://stackoverflow.com/questions/1606587/how-to-use-pil-to-resize-and-apply-rotation-exif-information-to-the-file
            orientation = metadata['Exif.Image.Orientation'].value
            
            if   orientation <= 1: pass
            elif orientation == 2: im = im.transpose(Image.FLIP_LEFT_RIGHT)
            elif orientation == 3: im = im.transpose(Image.ROTATE_180)
            elif orientation == 4: im = im.transpose(Image.FLIP_TOP_BOTTOM)
            elif orientation == 5: im = im.transpose(Image.FLIP_TOP_BOTTOM).transpose(Image.ROTATE_270)
            elif orientation == 6: im = im.transpose(Image.ROTATE_270)
            elif orientation == 7: im = im.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.ROTATE_270)
            elif orientation == 8: im = im.transpose(Image.ROTATE_90)
            else: print "unknown orientation:", orientation
        except:
            orientation = 1

        # generate thumbnails
        for sub, size in ( ("thumbs", 128), ("large", 1500), ("full", 3000) ):
            outfile = os.path.join(output_folder, sub, fname)
            if os.path.exists(outfile) and os.path.getmtime(outfile) > ori_time:
                continue
            it = im.copy()
            if size:
                it.thumbnail((size, size), Image.ANTIALIAS)
            it.save(outfile)

    if len(images) < 1:
        print "Album is empty, skiping"
        try:
            os.rmdir( os.path.join(output_folder, "thumbs") ) 
            os.rmdir( os.path.join(output_folder, "large")  ) 
            os.rmdir( os.path.join(output_folder, "full")   ) 
            os.rmdir( output_folder)
        except:
            print "!! Could not clean up empty album output"
        return None
    
    album_time = images_info[images[0]]["date"]
    album_mintime = album_time
    # sanitize dates for json output and pick album time
    for img_info in images_info.values():
        timestamp = img_info["date"]
        img_info["date"] = time.ctime(timestamp)
        if timestamp > album_time:
            album_time = timestamp
        if timestamp < album_mintime:
            album_mintime = timestamp

    # sort images by date
    images = sorted(images, key=lambda k: images_info[k]["date"])

    album_info["images"] = images
    album_info["images_info"] = images_info
    album_info["time"] = time.ctime(album_time)
    album_info["mintime"] = time.ctime(album_mintime)
    album_info["rawtime"] = album_time
    album_info["rawmintime"] = album_mintime
    album_info["imagecount"] = len(images)

    album_json = {}
    for k in ("title", "images", "images_info", "time", "mintime"):
        album_json[k] = album_info[k]
    jsonfile = open( os.path.join(output_folder, "album.json"), "w")
    json.dump(album_json, jsonfile)
    jsonfile.close()

    return album_info


"""
Scan a whole gallery:
* load metadata
* detect and scan albums
* generate the main json file
"""
def scan(source=os.getcwd()):
    meta_file = os.path.join(source, "gallery.yaml")
    if not os.path.exists(meta_file):
        print NOGALLERY
        help()
        return

    info = {"sizes": DEFAULT_SIZES}
    load_meta(info, os.path.join(source, "gallery.yaml"))

    dest = info["output"]    

    if not os.path.exists(source):
        print "no source folder"
        return
    
    if not os.path.exists(dest):
        init_output(dest)

    print "[SCAN gallery...]"
    albums = []
    for f in os.listdir(source):
        if f == dest:
            continue
        ff = os.path.join(source, f)
        if os.path.isdir(ff):
            album_info = scan_album(f, source, dest)
            if album_info:
                albums.append(album_info)

    albums = sorted(albums, reverse=True, key=lambda k: k["rawtime"])

    public = []
    restricted = {}
    for album_info in albums:
        if "restrict" in album_info:
            restrict_keys = album_info["restrict"].split(",")
            for rk in restrict_keys:
                rk = rk.strip()
                if rk not in restricted:
                    restricted[rk] = []
                restricted[rk].append(album_info)
        else:
            public.append(album_info)



    save_album_list(public, os.path.join(dest, "gallery.json"))
    for rk in restricted:
        save_album_list(restricted[rk]+public, os.path.join(dest,rk+".json"))

def save_album_list(raw_albums, jsonname):
    albums = []
    for raw_info in raw_albums:
        basic_info = {}
        for k in ("path", "title", "comment", "imagecount"):
            basic_info[k] = raw_info[k]
        basic_info["ref_image"] = raw_info["images"][0]
        basic_info["date"] = time.ctime(raw_info["rawtime"])
        albums.append(basic_info)

    jsonfile = open(jsonname, "w")
    json.dump(albums, jsonfile)
    jsonfile.close()


def init(source=os.getcwd(), output="output"):
    if not os.path.exists(source):
        print "no source folder"
        return

    meta_file = os.path.join(source, "gallery.yaml")
    if os.path.exists(meta_file):
        print "Gallery file already exists"
        return

    # write default config
    f = open(meta_file, "w")
    f.write("output: %s\n" % output)
    f.write("title: My Photo Gallery\n")
    f.close()

def init_output(dest):
    if os.path.exists(dest):
        return
    
    os.mkdir(dest)
    
    # TODO: copy index.html, js and css files
    packagedir = os.path.abspath(os.path.join(__file__, os.pardir))
    datadir = os.path.join( packagedir, "wg")
    if not os.path.exists(datadir):
        print "Could not find HTML skeleton, you are on your own!"
        print "It should have been in: "+ datadir
        return
    
    for fname in os.listdir(datadir):
        shutil.copyfile( os.path.join(datadir, fname), os.path.join(dest, fname) )


def help():
    print
    print "Usage:"
    cmd = os.path.basename(sys.argv[0])
    print cmd+"               update gallery"
    print cmd+" build         update gallery"
    print cmd+" init          create a new gallery"
    print cmd+" help          show this message"
    print

if __name__ == "__main__":
    nbargs = len(sys.argv)
    if nbargs > 2:
        print "Too many args"
        command = "help"
    elif nbargs == 2:
        command = sys.argv[1]
    else:
        meta_file = os.path.join(os.getcwd(), "gallery.yaml")
        if os.path.exists(meta_file):
            command = "build"
        else:
            print NOGALLERY
            command = "help"
            
    # run the selected action
    if command == "build":
        scan()
    elif command == "init":
        init()
    else:
        if command != "help":
            print "Unknown command"
        help()

