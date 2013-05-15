/*
 * Initialize the Web Gallery: reset data structure, trigger first load and register event handlers
 */
function sWG() {
    this.maindiv = $("#divswg")
    this.columnWidth = 180;
    this.loaded = {
        "albums" : undefined,
        "album"  : undefined,
        "key_gal": undefined,
        "key_alb": undefined,
        "key_pic": undefined,
    }
    $.sWG = this

    // listen hash changes (and check it immediately)
    $(window).hashchange(hashChanged)
    hashChanged()
    
    // let the main div be focusable and listen to key and swipe events
    this.maindiv.attr("tabindex", -1)
    this.maindiv.keydown(keypress_handler);
    this.maindiv.swipe( {swipe: swipe_handler} );
}


/*
 * React to swipe events: swipe right/left to change image
 */
function swipe_handler(event, direction, distance, duration, fingerCount) {
    // skip if outside album
    if ($.sWG.status["key_pic"] == undefined) {
        return;
    }

    if (direction == "right") {
        $.sWG.prev();
    } else if (direction == "left") {
        $.sWG.next();
    } else if (direction == "up") {
        $.sWG.back();
    }
}


/*
 * React to key events to navigate in the gallery
 */
function keypress_handler(event) {
    
/*    
    // skip if not focused
    if (document.activeElement != $.sWG.maindiv) {
        return;
    }
*/
    
    // skip when modifiers are in use
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    // TODO: detect j,k, and space
    
    // skip if outside album
    if ($.sWG.status["key_pic"] == undefined) {
        return;
    }

    if (event.keyCode == 37) {
        $.sWG.prev();
    } else if (event.keyCode == 39) {
        $.sWG.next();
    } else if (event.keyCode == 27) {
        $.sWG.back();
    } else {
        //alert(event.keyCode);
    }
}

/*
 * React to hash changes
 */
function hashChanged() {
    // extract the target gallery, album and image from the hash
    hstatus = {
        "key_gal": "",
        "key_alb": undefined,
        "key_pic": undefined,
    }

    hash = location.hash
    if (hash.length > 1) {
        hash = hash.substring(1).split("/")
        hstatus.key_gal = hash[0]

        if (hash.length > 1) {
            hstatus.key_alb = hash[1]
            if (hash.length > 2) {
                hstatus.key_pic = parseInt(hash[2])
                if (hstatus.key_pic < 2) {
                    hstatus.key_pic = 1;
                }
            }
        }
    }

    // update status and trigger the actual update
    $.sWG.status = hstatus;
    $.sWG.ensureData();
}

/*
 * Show an error message
 */
sWG.prototype.error = function(message) {
    this.maindiv.prepend("<div class='error'>"+message+"</div>")
}

/*
 * Callback when the list of albums has been loaded
 */
sWG.prototype.albumsLoaded = function(albums) {
    this.loaded.albums = albums
    this.loaded.key_gal = this.status.key_gal
    this.ensureData()
}

/*
 * Callback when a specific album has been loaded
 */
sWG.prototype.albumLoaded = function(album) {
    this.loaded.album = album
    this.loaded.key_alb = this.status.key_alb
    this.ensureData()
}

sWG.prototype.ensureData = function() {

    if (this.loaded.key_gal != this.status.key_gal) {
        this.maindiv.empty()
        this.maindiv.text("Loading albums...")
        if (!this.status.key_gal) {
            $.getJSON("gallery.json", loaded_cb)
        } else {
            $.getJSON(this.status.key_gal+".json", loaded_cb).error(keyloadfailed)
        }
        return
    }
        
    if (this.loaded.key_alb != this.status.key_alb) {
        if (this.status.key_alb) {
            this.maindiv.empty()
            this.maindiv.text("Loading album " + this.status.key_alb + "...")
            $.getJSON(this.status.key_alb+"/album.json", loaded_alb_cb)
            return
        }
        this.loaded.key_alb = undefined
        this.loaded.album = undefined
    }
        
    this.updateView()
}

/*
 * Update the current view:
 *  - start by ensuring that all required data is available
 *  - if needed load data asynchronously and return (will be called back)
 *  - delegate the actual view update to specialized functions
 *
 * This assumes that the current status describes the desired page
 */
sWG.prototype.updateView = function() {

    if (!this.status.key_alb) {
        this.showGallery()
        return
    }
    
    if (!this.status.key_pic) {
        this.showAlbum()
        return
    }
    
    this.showImage()
}


/*
 * Show the list of albums
 */
sWG.prototype.showGallery = function() {
    // prepare a grid list for albums
    this.maindiv.empty();
    gridview = $("<div class='gridview' />")

    // add albums
    for (idx in this.loaded.albums) {
        ab = this.loaded.albums[idx]
        album_thumb = "<a href='#"+this.status.key_gal+"/"+ ab["path"] +"'>" +
            "<div class='box'>" +
            "<img src='"+ab["path"]+"/thumbs/"+ab["ref_image"] +"'>" +
            "<div class='albumTitle'>" + ab["title"] + "</div>" +
            "</div></a>"
        gridview.append(album_thumb)
    }
    this.maindiv.append(gridview)
    gridview.masonry({
        itemSelector: ".box",
        columnWidth: this.columnWidth,
    });
}


/*
 * Show the images in a specific album
 */
sWG.prototype.showAlbum = function() {
    this.maindiv.empty()
    gridview = $("<div class='gridview' />")

    // add thumbnails
    images = this.loaded.album.images
    for (idx in images) {
        idx = parseInt(idx)
        img = images[idx]
        album_thumb = "<a href='#"+this.status.key_gal+"/"+ this.status.key_alb + "/" + (idx+1) +"'>" +
            "<div class='box'>" +
            "<img src='"+this.status.key_alb+"/thumbs/"+img +"'>" +
            "</div></a>"
        gridview.append(album_thumb)
    }
    this.maindiv.append(gridview)
    gridview.masonry({
        itemSelector: ".box",
        columnWidth: this.columnWidth,
    });
}

/*
 * Show one image from an album
 */
sWG.prototype.showImage = function() {
    // load the image
    img = "<img src='"+this.status.key_alb+"/large/"+this.loaded.album.images[this.status.key_pic-1] +"'>"

    // TODO: reuse existing imgview
    imgview = undefined;
    if (imgview == undefined) {
        this.maindiv.empty();
        imgview = $("<div class='imgview' />");
        this.maindiv.append(imgview);
    } else {
        imgview.empty();
    }
    
    // add the image, in a link to the next one if applicable
    if (this.status.key_pic < 10) {
        link = "<a href='#/" +this.status.key_alb + this.status.key_pic + "/" + "' />"

        //link.append(img)
        //imgview.append(link)
        imgview.append(img)
    } else {
        imgview.append(img)
    }

    this.maindiv.append(imgview)
    this.maindiv.focus()
}


sWG.prototype.next = function() {
    curidx = this.status["key_pic"];
    if (curidx == undefined) {
        // TODO: update selection in album or image lists
        return;
    }

    if (curidx < this.loaded.album.images.length) {
        location.hash = this.status.key_gal+"/"+ this.status.key_alb+"/"+(curidx+1);
    }
}

sWG.prototype.prev = function() {
    curidx = this.status["key_pic"];
    if (curidx == undefined) {
        // TODO: update selection in album or image lists
        return;
    }

    if (curidx > 1) {
        location.hash = this.status.key_gal+"/"+ this.status.key_alb+"/"+(curidx-1);
    }
}

sWG.prototype.back = function() {
    if (this.status["key_pic"] != undefined) {
        location.hash = this.status.key_gal+"/"+ this.status.key_alb;
    }
}


/*****************************************/
/*    Callbacks and error reporting      */
/*****************************************/

function loaded_cb(albums) {
    $.sWG.albumsLoaded(albums)
}
function loaded_alb_cb(album) {
    $.sWG.albumLoaded(album)
}

function keyloadfailed() {
    $.sWG.error("no such key")
    $.getJSON("gallery.json", loaded_cb)
}


// Create a gallery object when the page is loaded
function onload() {
    new sWG()
}
$(onload);

