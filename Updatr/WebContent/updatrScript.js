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

var oldChromeVersion = !chrome.runtime;
var requestTimerId;
var requestTimeout = 1000 * 2;
var pollIntervalMin = 1;  // 1 minute
var pollIntervalMax = 60;  // 1 hour

function getGmailUrl() {
  return "https://mail.google.com/mail/";
}

// Identifier used to debug the possibility of multiple instances of the
// extension making requests on behalf of a single user.
function getInstanceId() {
  if (!localStorage.hasOwnProperty("instanceId"))
    localStorage.instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
  return localStorage.instanceId;
}

function getFeedUrl() {
  // "zx" is a Gmail query parameter that is expected to contain a random
  // string and may be ignored/stripped.
  return getGmailUrl() + "feed/atom?zx=" + encodeURIComponent(getInstanceId());
}

function isGmailUrl(url) {
  // Return whether the URL starts with the Gmail prefix.
  return url.indexOf(getGmailUrl()) == 0;
}


function updateIcon() {
  if (!localStorage.hasOwnProperty('unreadCount')) {
    chrome.browserAction.setBadgeBackgroundColor({color:[208, 0, 24, 255]});
    chrome.browserAction.setBadgeText({text:"?"});
  } else {
    chrome.browserAction.setBadgeBackgroundColor({color:[208, 0, 24, 255]});
    chrome.browserAction.setBadgeText({
      text: localStorage.unreadCount != "0" ? localStorage.unreadCount : ""
    });
  }
}

function scheduleRequest() {
  console.log('scheduleRequest');
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, localStorage.requestFailureCount || 0);
  var multiplier = Math.max(randomness * exponent, 1);
  var delay = Math.min(multiplier * pollIntervalMin, pollIntervalMax);
  delay = Math.round(delay);
  console.log('Scheduling for: ' + delay);

  if (oldChromeVersion) {
    if (requestTimerId) {
      window.clearTimeout(requestTimerId);
    }
    requestTimerId = window.setTimeout(onAlarm, delay*60*1000);
  } else {
    console.log('Creating alarm');
    // Use a repeating alarm so that it fires again if there was a problem
    // setting the next alarm.
    chrome.alarms.create('refresh', {periodInMinutes: delay});
  }
}

function startRequest(params) {
  // Schedule request immediately. We want to be sure to reschedule, even in the
  // case where the extension process shuts down while this request is
  // outstanding.
  if (params && params.scheduleRequest) scheduleRequest();

  getInboxCount(
    function(count) {
      updateUnreadCount(count);
    },
    function() {
      delete localStorage.unreadCount;
      updateIcon();
    }
  );
}

function getInboxCount(onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();
  }, requestTimeout);

  function handleSuccess(count) {
    localStorage.requestFailureCount = 0;
    window.clearTimeout(abortTimerId);
    if (onSuccess)
      onSuccess(count);
  }

  var invokedErrorCallback = false;
  function handleError() {
    ++localStorage.requestFailureCount;
    window.clearTimeout(abortTimerId);
    if (onError && !invokedErrorCallback)
      onError();
    invokedErrorCallback = true;
  }

  try {
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;

      if (xhr.responseXML) {
        var xmlDoc = xhr.responseXML;
        var fullCountSet = xmlDoc.evaluate("/gmail:feed/gmail:fullcount",
            xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
        var fullCountNode = fullCountSet.iterateNext();
        if (fullCountNode) {
          handleSuccess(fullCountNode.textContent);
          return;
        } else {
          console.error(chrome.i18n.getMessage("gmailcheck_node_error"));
        }
      }

      handleError();
    };

    xhr.onerror = function(error) {
      handleError();
    };

    xhr.open("GET", getFeedUrl(), true);
    xhr.send(null);
  } catch(e) {
    console.error(chrome.i18n.getMessage("gmailcheck_exception", e));
    handleError();
  }
}

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

function updateUnreadCount(count) {
  var changed = localStorage.unreadCount != count;
  localStorage.unreadCount = count;
  updateIcon();
}

function goToInbox() {
  console.log('Going to inbox...');
  chrome.tabs.getAllInWindow(undefined, function(tabs) {
    for (var i = 0, tab; tab = tabs[i]; i++) {
      if (tab.url && isGmailUrl(tab.url)) {
        console.log('Found Gmail tab: ' + tab.url + '. ' +
                    'Focusing and refreshing count...');
        chrome.tabs.update(tab.id, {selected: true});
        startRequest({scheduleRequest:false});
        return;
      }
    }
    console.log('Could not find Gmail tab. Creating one...');
    chrome.tabs.create({url: getGmailUrl()});
  });
}

//used to start everything
function onInit() {
  console.log('onInit');
  localStorage.requestFailureCount = 0;
  startRequest({scheduleRequest:true});
  if (!oldChromeVersion) {
    chrome.alarms.create('watchdog', {periodInMinutes:5});
  }
}

//does stuff when alarm is triggered 
function onAlarm(alarm) {
  console.log('Got alarm', alarm);
  if (alarm && alarm.name == 'watchdog') {
    onWatchdog();
  } else {
    startRequest({scheduleRequest:true});
  }
}

//for if something goes wrong, checks if an alarm to get request if not
//make a new one and a request
function onWatchdog() {
  chrome.alarms.get('refresh', function(alarm) {
    if (alarm) {
      console.log('Refresh alarm exists. Yay.');
    } else {
      console.log('Refresh alarm doesn\'t exist!? ' +
                  'Refreshing now and rescheduling.');
      startRequest({scheduleRequest:true});
    }
  });
}

if (oldChromeVersion) {
  updateIcon();
  onInit();
} else {
  chrome.runtime.onInstalled.addListener(onInit);
  chrome.alarms.onAlarm.addListener(onAlarm);
}

var filters = {
  // Cannot use urlPrefix because all the url fields lack the protocol
  // part. See crbug.com/140238.
  url: [{urlContains: getGmailUrl().replace(/^https?\:\/\//, '')}]
};

//for stuff if navigating to gmail
function onNavigate(details) {
  if (details.url && isGmailUrl(details.url)) {
    console.log('Recognized Gmail navigation to: ' + details.url + '.' +
                'Refreshing count...');
    startRequest({scheduleRequest:false});
  }
}
if (chrome.webNavigation && chrome.webNavigation.onDOMContentLoaded &&
    chrome.webNavigation.onReferenceFragmentUpdated) {
  chrome.webNavigation.onDOMContentLoaded.addListener(onNavigate, filters);
  chrome.webNavigation.onReferenceFragmentUpdated.addListener(
      onNavigate, filters);
} else {
  chrome.tabs.onUpdated.addListener(function(_, details) {
    onNavigate(details);
  });
}

chrome.browserAction.onClicked.addListener(goToInbox);

//for when chrome starts
if (chrome.runtime && chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(function() {
    console.log('Starting browser... updating icon.');
    startRequest({scheduleRequest:false});
    updateIcon();
  });
} else {
  // This hack is needed because Chrome 22 does not persist browserAction icon
  // state, and also doesn't expose onStartup. So the icon always starts out in
  // wrong state. We don't actually use onStartup except as a clue that we're
  // in a version of Chrome that has this problem.
  chrome.windows.onCreated.addListener(function() {
    console.log('Window created... updating icon.');
    startRequest({scheduleRequest:false});
    updateIcon();
  });
}

//updatrScript.js