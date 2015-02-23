/* jshint node: true, jquery: true */
'use strict';
//$(document).ready(function() {

  var fbUrl = 'https://spookydating.firebaseio.com';
  var fb = new Firebase(fbUrl);
  var defaultPicture = "http://vignette4.wikia.nocookie.net/mansionsofmadness/images/4/4d/Cthonian.jpg/revision/latest/scale-to-width/212?cb=20130219200035";
  var usersFb;
  var userListSnapshot;
  var allUsers;
  var undecidedUsers = [];
  var profileInfo;
  var userInfo;
  var outOfMatchesPicture = "http://38.media.tumblr.com/tumblr_maxvb8paub1qiw53no1_500.gif";

  //LOGIN FUNCTION//
  $('#login').click(function() {
    var $form = $($(this).closest('form'));
    var email = $form.find('[type="email"]').val();
    var password = $form.find('[type="password"]').val();
    var loginData = {email: email, password: password};
    userLogin(loginData);
  });

  function userLogin(loginData) {
    fb.authWithPassword(loginData, function(err) {
      if (err) {
        $('.error').text('BEWARE, SPOOKSTER! Your email address or password is invalid.');
      } else {
        goToProfilePage();
      }
    });
  }

  //REDIRECT FUNCTION - LOGIN//
  function goToProfilePage() {
    window.location.href = 'profile.html';
  }

  //REGISTER OR LOGIN FUNCTION//
  $('#createUser').click(function() {
    var $form = $($(this).closest('form'));
    var email = $form.find('[type="email"]').val();
    var password = $form.find('[type="password"]').val();
    var loginData = {email: email, password: password};

    registerAndLogin(loginData, function(err) {
      if (err) {
        $('.error').text('BEWARE, SPOOKSTER! Your email address or password is invalid.');
      } else {
        goToProfilePage();
      }
    });
  });

  //REGISTER AND LOGIN FUNCTION//
  function registerAndLogin(obj, cb) {
    fb.createUser(obj, function(err) {
      if (!err) {
        fb.authWithPassword(obj, function(err, auth) {
          if (!err) {
            cb(null, auth);
          } else {
            cb(err);
          }
        });
      } else {
        cb(err);
      }
    });
  }

  //APPEND TO PROFILE AND PUSH TO FIREBASE//
  $('#submitUserDataToPage').click(function(event) {
    event.preventDefault();
    userInfo = {
           name: $('#userProfileName').val(),
          image: $('#userProfileImage').val(),
            bio: $('#userProfileBio').val(),
      interests: $('#userProfileInterests').val(),
         userID: usersFb.key()
    };

    addUserToDatabase(userInfo, function(data) {
      $('.profile_info_holder').attr('data-uuid', data);
    });

    addUserInformationToPage(userInfo);
    $('#userProfileName').val('');
    $('#userProfileImage').val('');
    $('#userProfileBio').val('');
    $('#userProfileInterests').val('');
    $('#add_profile_info').toggleClass('hidden');
  });

  //PUSH TO DB FUNCTION//
  function addUserToDatabase(data, cb) {
    usersFb = fb.child('users/' + fb.getAuth().uid);
    var uuid = usersFb.set(data);
    cb(uuid);
  }

  //CLEAR FORM//
  function emptyProfileForm(form) {
    $('form').empty();
  }


  //ADD USER INFORMATION TO PAGE//
  function addUserInformationToPage(data) {
    $('.profile_info_holder').append('<div><img src="' + data.image +
                                    '" class="profile_picture defaultPicture"><div>Name: ' + data.name +
                                    '</div><div>Bio: ' + data.bio +
                                    '</div><div>Interests: ' + data.interests +
                                    '</div></div>');

    $(".defaultPicture").error(function() {
      $(this).attr('src', defaultPicture);
    });
   }


  //LOAD INFORMATION WHEN LOGGED IN//
  if(fb.getAuth()) {
    usersFb = fb.child('users/' + fb.getAuth().uid);
    usersFb.once('value', function(data) {
      profileInfo = data.val();
      addUserInformationToPage(profileInfo);
    });

    //ON PAGE LOAD, GET USER OBJECT//
    fb.child('users').once('value', function(snap) {
      userListSnapshot = snap.val();
      //allUsers = userListSnapshot.map(); //total list of users (including me!)
      delete userListSnapshot[(usersFb.key())]; //removes self from object
      var currentUserToDisplay = getNewUnmatchedUser();
      showUnmatchedUser(currentUserToDisplay);
    });
  }

  function getNewUnmatchedUser () {
    return _.sample(userListSnapshot);
  }

  function showUnmatchedUser (user) {
    if(user && user.userID){
      $('.potentialMatch').append('<div data-uid="' + user.userID + '"><img src="' + user.image + '"></div>' );
    }else{
      showOutOfMatchesPicture();
    }
  }

  function showOutOfMatchesPicture(){
    $('.potentialMatch').append('<img src="' + outOfMatchesPicture + '"/>');
    $('#like_match').hide();
    $('#dislike_match').hide();
  }

  function generateNewChoice () {
    $('.potentialMatch').empty();
    showUnmatchedUser(getNewUnmatchedUser());
  }

  $('#like_match').on('click', function() {
    var likedUser = $('div[data-uid]').data().uid;
    if (!profileInfo.likes) {
      profileInfo.likes = [];
    }
    profileInfo.likes.push( likedUser );
    usersFb.set(profileInfo);
    delete userListSnapshot[(likedUser)];
    generateNewChoice();
    //profit.
  });


  $('#dislike_match').on('click', function() {
    var dislikedUser = $('div[data-uid]').data().uid;
    if (!profileInfo.dislikes) {
      profileInfo.dislikes = [];
    }
    profileInfo.dislikes.push( dislikedUser );
    usersFb.set(profileInfo);
    delete userListSnapshot[(dislikedUser)];
    generateNewChoice();
    //profit.
  });

  function findMyMatches (currentUserLogin, listOfUserObjects) {
    var currentUserLikes = [];
    _.forIn(listOfUserObjects, function(user) {
      _.forEach(user.likes, function(item) {
        if (item === currentUserLogin) {
          currentUserLikes.push(user);
        }
      })
    });
    return currentUserLikes;
  }

  if (profileInfo !== 'undefined') {
    $('.profile_page_headers').addClass('hidden');
    $('#userProfileInfoForm').addClass('hidden');
    $('.profileButtonControls').append('<button class="editProfile"> Edit Profile');
  }

  $('.editProfile').on('click', function() {
    $('#userProfileInfoForm').toggleClass('hidden');
  });

  $('#showMatchedUsers').on('click', function() {
    var matchedUsers = findMyMatches(usersFb.key(), userListSnapshot);
    _.forEach(matchedUsers, function(item) {
      $('.matches_holder').append('<div class="matchedUserInfo"><img class="matchedUserImage" src="' +
                                  item.image +
                                  '"><div>Name: ' +
                                  item.name +
                                  '</div><div>Bio: ' +
                                  item.bio +
                                  '</div><div>Interests: ' +
                                  item.interests +
                                  '</div></div>');
    })
  })


  //FIND MATCHES
  function matches(data, uuid) {
    var myLikes = profileInfo.likes;

    return _.filter(myLikes, function(user, i) {
      var userData = userListSnapshot[user].data,
          userLikes = usersLikes(userData);

      return _.includes(userLikes, uuid);
    });
  }

  //FIND UNMATCHED USERS//
  function findUnmatched(data, uuid) {
    var users      = _.keys(userListSnapshot);
    var myLikes    = usersLikes(data[0]);
    var myDislikes = usersDislikes(data[0]);
    var self       = [fb.getAuth().uid];
    return _.difference(users, self, myLikes, myDislikes);
  };
  function usersLikes(userData) {
    if (userData && userData.likes) {
      return _(userData.likes)
        .values()
        .map(function(user) {
          return user.id;
        })
        .value();
    } else {
      return [];
    }
  }
  function usersDislikes(userData) {
    if (userData && userData.dislikes) {
      return _(userData.dislikes)
        .values()
        .map(function(user) {
          return user.id;
        })
        .value();
    } else {
      return [];
    }
  }
  //LOGOUT FUNCTION//
  $('#logout').click(function() {
    fb.unauth();
    window.location.href = 'index.html';
  });


//});

//FUNCTIONS FOR TESTING//
var hello = function hello() {
  return 'world';
};

function validatePassword (password) {
  if (password.length > 5) {
    return true;
  } else {
    return false;
  }
}
function validateEmailAddress (emailAddress) {
  if (emailAddress.substring(emailAddress.length-4) === ".com") {
    return true;
  } else {
    return false;
  }
}


