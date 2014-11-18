/**
 *  Javascript for updatrPopup.html 
 *  
 *  @author Tim Seavey
 *  @author Meeshaan Shah
 *  @version 1.0
 *  
 *  This file contains most of the functionality of updatr
 *  including the login functionality of each social media
 *  outlet. 
 *  
 *  */

 //Initialize the facebook SDK from best practices at facebook developer instruction
  window.fbAsyncInit = function() {
    FB.init({
      appId      : 'your-app-id',
      xfbml      : true,
      version    : 'v2.1'
    });
  };

  (function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
   }(document, 'script', 'facebook-jssdk'));
 
  
 //second fb SDK init
  
  window.fbAsyncInit = function() {
      FB.init({
        appId      : 'updatrUnofficialid',
        xfbml      : true,
        version    : 'v2.1'
      });
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "//connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
 
  
  
  
  
  
  //updatrScript.js