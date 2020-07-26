/*jshint esversion: 6 */
window.onload = function(){
    "use strict";
    //localStorage.clear();

    api.onError(function(err){
        console.error("[error]", err);
    });
    
    api.onError(function(err){
        let error_box = document.querySelector('#error_box');
        error_box.innerHTML = err;
        error_box.style.visibility = 'visible';
    });
    
    // Hide everything when not logged in
    api.onUserUpdate(function(username){
        document.querySelector("#signin_button").style.visibility = (username)? 'hidden' : 'visible';
        document.querySelector("#signout_button").style.visibility = (username)? 'visible' : 'hidden';
        document.querySelector('#create_add_photo').style.visibility = (username)? 'visible' : 'hidden';
        document.querySelector('#new_comment').style.visibility = (username)? 'visible' : 'hidden';
        document.querySelector('#photo').style.visibility = (username)? 'visible' : 'hidden';
        document.querySelector('#messages_list').style.visibility = (username)? 'visible' : 'hidden';
        document.querySelector('#post_username').style.visibility = (username)? 'visible' : 'hidden';
    });

    // Updating the site when a user changes 
    api.onUsersUpdate(function(usernames){
        document.querySelector("#post_username").innerHTML = "";
        if (usernames.length === 0) ;
        else {
            usernames.forEach(function(username){
                let elmt = document.createElement('option');
                elmt.value = username._id;
                elmt.innerHTML = username._id;
                document.querySelector("#post_username").prepend(elmt);
            });
        };
    });

    // This is used to toggle between different galleries
    document.getElementById("post_username").addEventListener("change", function(e){
        let curr_user = document.getElementById("post_username").value;
        api.setUser(curr_user, function(){
            api.notifyImageListeners();
        })
    })

    // This function used to add images using the button
    document.getElementById('create_add_photo').addEventListener('submit', function(e){
        // prevent from refreshing the page on submit
        e.preventDefault();
        // read form elements
        let title = document.getElementById("add_title").value;
        let url = document.getElementById("add_url").files[0];
        // add the image to storage
        api.addImage(title,url);
        // clean form
        document.getElementById("create_add_photo").reset();
    });

    // This function is used to add comments using the button
    document.getElementById('new_comment').addEventListener('submit', function(e){
        // prevent from refreshing the page on submit
        e.preventDefault();
        // read form elements
        let comment_message = document.getElementById("comment_message").value;
        // add the comment to storage
        api.addComment(api.getID(),comment_message);
        // clean form
        document.getElementById("new_comment").reset();
    });

    // Listener function
    api.onImageUpdate(function(items){
        if(api.checkImages(items) == true){ // This section uploads the current photo to the gallery
            document.getElementById("photo").innerHTML = '';
            let img = items[api.getCounter()-1]; // gets the current image shows
            let elmt = document.createElement('div');
            elmt.className = "new_container";
            elmt.innerHTML=`
                <button id="nextprev-align" class="button" onclick="api.getPrevImage()">Prev</button>
                <div id=column-align>
                    <div class="image_box">
                        <div class="image_box_title">Name of Photo is ${img.title} by ${img.author}</div>
                        <img src="/api/images/${img._id}" width="780" height="500">
                    </div>
                        <div id="center-align-delete">
                            <div class="delete-image"></div>
                        </div>
                </div>
                <button id="nextprev-align" class="button" onclick="api.getNextImage()">Next</button>
            `;
            elmt.querySelector('.delete-image').addEventListener('click', function(e){
                api.deleteImage(img._id);
            });
            api.setID(img._id); // this is to store which image we are currently at to add/delete comments
            api.counter = items.length; // switch to the new image we added
            document.getElementById("photo").prepend(elmt);
        }
        else{
            // This section runs when there are no current photos in the gallery
            document.getElementById("photo").innerHTML = '';
            document.getElementById("photo").innerHTML=`
            <div class="container">
                <div class="image_box">
                    <div class="image_box_title">Name and Author goes here</div>
                    <img src="./media/default.png" width="780" height="500">
                </div>
            </div>
            `;
        }
    });

    // Listener for comments
    api.onCommentUpdate(function(each_comment){
        if(api.imageCheck() == true){ // This checks if there are any images or not 
            document.getElementById("messages_list").innerHTML = '';
            let curr_img = api.getID(); // gets the current image were at using the image id
            let i;
            // This loops through each comment in the database
            for(i=0; i<each_comment.length; i++){
                if(each_comment.length != 0){ // Checks if there are any comments stored
                    if(curr_img == each_comment[i].imageId){ // if the image id's match then print the comment
                        let curr_comment = each_comment[i]._id;
                        let elmt = document.createElement('div');
                        elmt.className = "message";
                        elmt.innerHTML=`
                            <div class="messages">
                                <div id="left-align" id="column-align id="name">
                                    <p id="name"><b>${each_comment[i].author}</b></p>
                                    <p id="date">${each_comment[i].date}</p>
                                </div>
                                <p id="message_text">${each_comment[i].content}</p>
                                <div id="right-align">
                                    <div class="delete-icon"></div>
                                </div>
                            </div>
                        `;
                            elmt.querySelector('.delete-icon').addEventListener('click', function(e){
                                api.deleteComment(curr_comment);
                            });
                            document.getElementById("messages_list").prepend(elmt);
                    }
                }
                // This runs if there are no comments
                else{
                    document.getElementById("messages_list").innerHTML = '';
                    document.getElementById("messages_list").prepend('');
                }
            }
        }
        // This runs if there are no images
        else{
            document.getElementById("messages_list").innerHTML = '';
            document.getElementById("messages_list").prepend('');
        }

    });  
};