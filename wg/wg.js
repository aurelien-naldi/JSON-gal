/*
 * Initialize the Web Gallery: reset data structure, trigger first load and register event handlers
 */
function sWG() {
    this.maindiv = $("#div-swg")
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
    this.refreshHash()
}

/*
 * Callback when the list of albums has been loaded
 */
sWG.prototype.refreshHash = function() {
    this.status = parseHash()
    this.ensureData()
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
        this.showAlbums()
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
sWG.prototype.showAlbums = function() {
    this.maindiv.empty()
    gridview = $("<div class='gridview' />")
    for (idx in this.loaded.albums) {
        ab = this.loaded.albums[idx]
        album_thumb = "<a href='#"+this.status.key_gal+"/"+ ab["path"] +"'>" +
            "<div class='box'>" +
            "<img src='"+ab["path"]+"/thumbs/"+ab["ref_image"] +"'>" +
            "<div class='albumTitle'>" + ab["title"] + "</div>" +
            "</div></a>"
        gridview.append(album_thumb)
    }
    gridview.masonry({
        itemSelector: '.album',
        columnWidth: 150,
    });
    this.maindiv.append(gridview)
}


/*
 * Show the images in a specific album
 */
sWG.prototype.showAlbum = function() {
    this.maindiv.empty()
    gridview = $("<div class='gridview' />")
    images = this.loaded.album.images
    for (idx in images) {
        img = images[idx]
        album_thumb = "<a href='#"+this.status.key_gal+"/"+ this.status.key_alb + "/" + img +"'>" +
            "<div class='box'>" +
            "<img src='"+this.status.key_alb+"/thumbs/"+img +"'>" +
            "</div></a>"
        gridview.append(album_thumb)
    }

    gridview.masonry({
        itemSelector: '.album',
        columnWidth: 150,
    });
    this.maindiv.append(gridview)
}

/*
 * Show the images in a specific album
 */
sWG.prototype.showImage = function() {
    this.maindiv.empty()
    album_thumb = "<img src='"+this.status.key_alb+"/large/"+this.status.key_pic +"'>"
    this.maindiv.append(album_thumb)
}


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

function next() {
    alert("next")
}

function prev() {
    alert("prev")
}

function back() {
    alert("back")
}

function parseHash() {
    result = {
        "key_gal": "",
        "key_alb": undefined,
        "key_pic": undefined,
    }

    hash = location.hash
    if (hash.length > 1) {
        hash = hash.substring(1).split("/")
        result.key_gal = hash[0]

        if (hash.length > 1) {
            result.key_alb = hash[1]
            if (hash.length > 2) {
                result.key_pic = hash[2]
            }
        }
    }

    return result
}

function hashChanged() {
    // TODO: refresh hash
    $.sWG.refreshHash()
}

// Create a gallery object when the page is loaded
function onload() {
    new sWG()
    
}
$(onload);

