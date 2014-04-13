var el,
        grid;

    var Helper = (function (){
        var debounce = function (a,b,c){var d;return function(){var e=this,f=arguments;clearTimeout(d),d=setTimeout(function(){d=null,c||a.apply(e,f)},b),c&&!d&&a.apply(e,f)}};
        this.urlMap = {};

        this.setMapping = function (key, value){
            this.urlMap[key] = value;
        };

        this.getMapping = function (key){
            return this.urlMap[key];
        };

        this.getValues = function (jsonObject){
            var arr = [];
            for (var i in jsonObject){
                arr.push(jsonObject[i]);
            }
            return arr;
        }

        this.debouncedResize = debounce(function() {
            grid.resize();
            grid.redraw(true);
        }, 200);

        return this;
    })();

    $(document).ready(function(){
        el = $('#friend-tiles');
        grid = new Tiles.Grid(el);

        grid.createTile = function(data) {
            var tileDiv = '<div>';
            tileDiv += '<div id="' + data.uid + '" class="viewport">';
            tileDiv += '<br><img class="clipped" src="' + data.pic + '">';
            tileDiv += '</div>'
            tileDiv += '<div id="tile-info">';
              tileDiv += '<div>' + data.name + ' @ ';
                tileDiv += '<a class="fb-info" href="' + data.url_fb +'" target="_blank">FB</a>';
              tileDiv += '</div>';
            tileDiv += '</div>'; 
            tileDiv += '</div>';
            var tile = new Tiles.Tile(data.uid, tileDiv); //needs a unique id
            return tile;
        };

        grid.cellSizeMin = grid.cellSize = 230;

        // when the window resizes, redraw the grid
        $(window).resize(Helper.debouncedResize);

        $('#location-button').click(function (e){
          queryHandler(true);
        });
        $('#location-input').keypress(function (e){
          queryHandler(e);
        });
    });


    var isLoggedIn = false;
    window.fbAsyncInit = function() {
        FB.init({
          appId      : '294814463976666', // Set YOUR APP ID
          status     : true, // check login status
          cookie     : true, // enable cookies to allow the server to access the session
          xfbml      : true  // parse XFBML
        });
     
        FB.Event.subscribe('auth.authResponseChange', function(response) {
          if (response.status === 'connected') {
            isLoggedIn = true;
            //document.getElementById("message").innerHTML +=  "<br>Connected to Facebook";
            //SUCCESS
          } else if (response.status === 'not_authorized') {
            document.getElementById("message").innerHTML +=  "<br>Failed to Connect";
            //FAILED
          } else {
            document.getElementById("message").innerHTML +=  "<br>Logged Out";
            //UNKNOWN ERROR
          }
        }); 

    };
 
    function Login() {
        FB.login(function(response) {
            if (response.authResponse) {
                getUserInfo();
            } else {
             console.log('User cancelled login or did not fully authorize.');
            }
         },{scope: 'email,user_photos,user_friends,friends_location,friends_photos'});
    }
 
    function getUserInfo() {
        $('#friend-tiles').html('');
        var location = $('#location-input').val();
        if (!location){
            alert('No location specified.')
        }
        var splitLocations = location.split(/[ ,]+/);
        var infoQuery = 'SELECT name, uid, current_location.name, profile_url ' + 
                        'FROM user ' +
                        'WHERE uid in (SELECT uid2 FROM friend WHERE uid1 = me()) ';

        for (var i =0; i< splitLocations.length; i++){
            infoQuery += 'AND strpos(lower(current_location.name), \"' + splitLocations[i] + '\") >= 0 '
        }

        FB.api('fql', {
            q:  infoQuery
        }, 
        function(response) {
            var data = response.data;
            var error = response.error;
            var infoMap = {};

            if (error || data.length === 0){
                $('#friend-tiles').html('No friends found.  You don\'t have any friends.');
                return;
            }

            for (var i = 0, length = data.length; i< length; i++){
                infoMap[data[i].uid] = {
                    uid: data[i].uid, 
                    name: data[i].name, 
                    url_fb: data[i].profile_url
                };
            }
            getUserPicFB(infoMap);
        });

    }

    function getUserPicFB(infoMap){
        var tile = '';
        var width = height = 200;
        if (navigator.platform.match('Mac')){ //idk look at fb api TODO:
            width = height = 100;
        }
        var picQuery = 'SELECT id, url ' +
                      'FROM profile_pic ' +
                      'WHERE id in (' + Object.keys(infoMap).toString() + ') AND width=' + width + ' AND height=' + height;

        FB.api('fql', {
            q: picQuery
        }, 
        function (response) {
            var data = response.data;
            var id;

            for (var i = 0, length = data.length; i < length; i++){
                infoMap[data[i].id]['pic'] = data[i].url;
            }

            grid.updateTiles(Helper.getValues(infoMap));
            grid.redraw(false);
            Helper.debouncedResize();
        });
    }

    function Logout()
    {
        FB.logout(function(){document.location.reload();});
    }

    function queryHandler(e){
      if (e === true || e.keyCode === 13){
        if (!isLoggedIn)
          Login();
        else
          getUserInfo();
      }
    }


    function setViewport(img, x, y, width, height) {
        if (img === undefined)
          return;

        if (width !== undefined) {
            img.parentNode.style.width  = width  + "px";
            img.parentNode.style.height = height + "px";
        }
    }

    // Load the SDK asynchronously
    (function(d){var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    if (d.getElementById(id)) {return;} js = d.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/all.js"; ref.parentNode.insertBefore(js, ref);}(document));