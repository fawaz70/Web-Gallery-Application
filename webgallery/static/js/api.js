/*jshint esversion: 6 */
let api = (function(){
    "use strict";

    // used to send files
    // this piece of code copied from lecture notes at https://github.com/ThierrySans/CSCC09/blob/master/lectures/04/src/upload-ajax/static/js/api.js
    function sendFiles(method, url, data, callback){
        let formdata = new FormData();
        Object.keys(data).forEach(function(key){
            let value = data[key];
            formdata.append(key, value);
        });
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        xhr.send(formdata);
    }

    function send(method, url, data, callback){
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    let module = {};

    let counter = 1; // This is used to keep track of which image we are currently displaying
    let check = false;

    // small storage to store the current image id just to keep track and the owner of the image
    if (!localStorage.getItem('imgId')){
        localStorage.setItem('imgId', JSON.stringify({curr_user:"", current:0}));
    }
    
    /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) imageId 
            - (String) title
            - (String) author
            - (String) url
            - (Date) date
    
        comment objects must have the following attributes
            - (String) commentId
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */ 

    let userListeners = [];
    let usersListeners = [];
    
    // Code for users taken from lab 6
    let getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }
    
    function notifyUserListeners(username){
        userListeners.forEach(function(listener){
            listener(username);
        });
    };
    
    module.onUserUpdate = function(listener){
        userListeners.push(listener);
        listener(getUsername());
    }

    let getUsers = function(callback){
        send("GET", "/api/users/", null, callback);
    };

    module.onUsersUpdate = function(listener){
        usersListeners.push(listener);
        getUsers(function(err, users){
            if (err) return notifyErrorListeners(err)
            listener(users);
        })
    }

    module.signup = function(username, password){
        send("POST", "/signup/", {username, password}, function(err, res){
             if (err) return notifyErrorListeners(err);
             notifyUserListeners(getUsername());
        });
    }
    
    module.signin = function(username, password){
        send("POST", "/signin/", {username, password}, function(err, res){
             if (err) return notifyErrorListeners(err);
             notifyUserListeners(getUsername());
        });
    }

    module.signout = function(){
        send("GET", "/signout/", function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
       });
    }

    // These 2 functions are setters and getters to keep track of current image id 
    module.setID = function(curr_id){
        let imgId = JSON.parse(localStorage.getItem('imgId'));
        imgId.current = curr_id;
        localStorage.setItem('imgId', JSON.stringify(imgId));
    };

    module.getID = function(){
        let imgId = JSON.parse(localStorage.getItem('imgId'));
        return imgId.current;
    };

    // There 2 functions are setters and getters to keep track of the current user
    module.setUser = function(curr_id, callback){
        let imgId = JSON.parse(localStorage.getItem('imgId'));
        imgId.curr_user = curr_id;
        localStorage.setItem('imgId', JSON.stringify(imgId));
        return callback();
    };

    module.getUser = function(){
        let imgId = JSON.parse(localStorage.getItem('imgId'));
        return imgId.curr_user;
    };
    
    // add an image to the gallery
    module.addImage = function(title, file){
        sendFiles("POST", "/api/images/", {title: title, picture:file}, function(err, res){
            if (err) return notifyErrorListeners(err);
            api.notifyImageListeners();
            notifyCommentListeners();
       });
    };
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        counter = 1; // reset the image to the first image 
        send("DELETE", "/api/images/" + imageId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            api.notifyImageListeners();
            notifyCommentListeners();
       });
    };

    // This gets the counter used to get the current image we are at 
    module.getCounter = function(){
        return counter;
    };

    // used to move between pictures
    module.increment = function(){
        counter++;
    };

    // This method gets the previous image (used to traverse next/prev)
    module.getPrevImage = function(){
        if(counter > 1){
            counter--;
        }
        api.notifyImageListeners();
        notifyCommentListeners();
    };

    // This method gets the next image (used to traverse next/prev)
    module.getNextImage = function(){
        getImages(function(err, images){
            if (err) return notifyErrorListeners(err);
            if(counter != images.length){
                api.increment();
                api.notifyImageListeners();
                notifyCommentListeners();
            }
        });
    };

    // These functions are used to check whether we have any images in the library at the moment
    module.checkImages = function(images){
        if(images.length != 0){
            check = true;
            return true;
        }
        else{
            check = false;
            return false;
        }
    };

    module.imageCheck = function(){
        return check;
    };

    // Used to get list of images for image listener
    let getImages = function(callback){
        send("GET", "/api/images/?owner=" + api.getUser(), null, callback);
    };

    // Used to get list of comments for comments listener
    let getComments = function(callback){
        send("GET", "/api/comments/", null, callback);
    };
    
    // add a comment to an image
    module.addComment = function(imageId, content){
        send("POST", "/api/comments/", {imageId: imageId, author:getUsername(), content:content}, function(err, res){
            if (err) return notifyErrorListeners(err);
                notifyCommentListeners();
       });
    };
    
    // delete a comment to an image
    module.deleteComment = function(commentId){
        send("DELETE", "/api/comments/" + commentId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            api.notifyImageListeners();
            notifyCommentListeners();
       });
    };

    // Listeners for image and comments
    let imageListeners = []; 
    let commentListeners = [];
    let errorListeners = [];
    
    // call handler when an image is added or deleted from the gallery
    module.onImageUpdate = function(listener){
        imageListeners.push(listener);
        getImages(function(err, images){
            if (err) return notifyErrorListeners(err);
            listener(images);
        });
        notifyCommentListeners();
    };
    
    // call handler when a comment is added or deleted to an image
    module.onCommentUpdate = function(listener){
        commentListeners.push(listener);
        getComments(function(err, comments){
            if (err) return notifyErrorListeners(err);
            listener(comments);
        });
    };

    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }

    module.onError = function(listener){
        errorListeners.push(listener);
    };
    
    // These 2 functions are listeners
    module.notifyImageListeners = function() {
        getImages(function(err, images){
            if (err) return notifyErrorListeners(err);
            imageListeners.forEach(function(listener){
                listener(images);
            });
        });
    }

    function notifyCommentListeners(){
        getComments(function(err, comments){
            if (err) return notifyErrorListeners(err);
            commentListeners.forEach(function(listener){
                listener(comments);
            });
        });
    }

    // Function used for hide and unhide
    module.hideUnhide = function(){ 
        // Code shown below found at https://www.w3schools.com/howto/howto_js_toggle_hide_show.asp
        let x = document.getElementById("showhide");
        if (x.style.display === "none") {
          x.style.display = "block";
        } else {
          x.style.display = "none";
        }
    };
    
    // This refreshes the pace ever 2 seconds
    (function refresh(){
        setTimeout(function(e){
            api.notifyImageListeners();
            notifyCommentListeners();
            refresh();
        }, 2000);
    }());

    return module;
})();