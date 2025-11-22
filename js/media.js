// credit for the syncing code:
// Moritz Walter (https://github.com/makertum)
// https://stackoverflow.com/a/38210292
// load youtube iframe api
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
// set video
// var youtubeId = '86JYR7bK6RU';
var youtubeId = 'xpYfBhtu8xY'
// the players
var player1;
var player2;
// the rules
var syncThreshold=0.0;
var jumpThreshold=1;
var jumpDeadTime=500;
// timeouts and intervals
var timeSyncInterval;
var syncActionTimeout=undefined;
// The YouTube API calls this once it's ready
function onYouTubeIframeAPIReady() {
  setTimeout(function(){
    player1 = new YT.Player('front', {
      height: '100%',
      width: '100%',
      videoId: youtubeId,
      playerVars: {
        'rel': 0
      },
      events: {
        onReady: syncTime,
        onStateChange: syncStateChange
      }
    });
    player2 = new YT.Player('back', {
      height: '100%',
      width: '100%',
      videoId: youtubeId,
      playerVars: {
        'mute': 1,
        'rel': 0
      }
    });
  }, 1200)
}
// the syncing magic
function syncTime(){
  clearInterval(timeSyncInterval);
  timeSyncInterval = setInterval(function () {
    if(syncActionTimeout==undefined){
      var time1=player1.getCurrentTime();
      var time2=player2.getCurrentTime();
      var timeDifference=time2-time1;
      var timeDifferenceAmount=Math.abs(timeDifference);
      var syncActionDuration=1000*timeDifferenceAmount/2;
      if(timeDifferenceAmount>jumpThreshold){
        console.log("Players are "+timeDifferenceAmount+" apart, Jumping.");
        player2.seekTo(player1.getCurrentTime());
        syncActionTimeout=setTimeout(function () {
          syncActionTimeout=undefined;
        },jumpDeadTime);
      }else if(timeDifference>syncThreshold){
        player2.setPlaybackRate(0.5);
        syncActionTimeout=setTimeout(function () {
          player2.setPlaybackRate(1);
          syncActionTimeout=undefined;
        },syncActionDuration);
      }else if(timeDifference<-syncThreshold){
        player2.setPlaybackRate(2);
        syncActionTimeout=setTimeout(function () {
          player2.setPlaybackRate(1);
          syncActionTimeout=undefined;
        },syncActionDuration);
      }
    }
  },1000);
}
function syncStateChange(e){
  if(e.data==YT.PlayerState.PLAYING){
    player2.seekTo(player1.getCurrentTime());
    player2.playVideo();
  }else if(e.data==YT.PlayerState.PAUSED){
    player2.seekTo(player1.getCurrentTime());
    player2.pauseVideo();
  }
}

// Backlight Switch Toggle
document.addEventListener('DOMContentLoaded', function() {
  const switchElement = document.querySelector('.switch');
  const switchHandle = document.querySelector('.switch__handle');
  const rickAndMorty = document.querySelector('.rick_and_morty');
  const gestureRecognizer = document.querySelector('.gesture-recognizer');
  
  if (switchElement && switchHandle) {
    // Helper function to check if switch is in right position (backlight on)
    function isSwitchOnRight() {
      const transform = switchHandle.style.transform || '';
      return transform.includes('translate(100%)') || 
             transform.includes('translate3d(100%') ||
             transform === '';
    }
    
    // Helper function to update cabin shake state
    function updateCabinShakeState(isCabinShakeActive) {
      if (isCabinShakeActive) {
        // Cabin shake ON - switch is on the left
        if (rickAndMorty) {
          rickAndMorty.classList.add('active');
        }
        if (gestureRecognizer) {
          gestureRecognizer.classList.add('cabin-shake-active');
        }
      } else {
        // Cabin shake OFF - switch is on the right
        if (rickAndMorty) {
          rickAndMorty.classList.remove('active');
        }
        if (gestureRecognizer) {
          gestureRecognizer.classList.remove('cabin-shake-active');
        }
      }
    }
    
    // Check initial state - inline style has translate3d(100%, 0, 0) = backlight on, cabin shake off
    const initialIsOnRight = isSwitchOnRight();
    updateCabinShakeState(!initialIsOnRight);
    
    switchElement.addEventListener('click', function() {
      const isOnRight = isSwitchOnRight();
      
      if (isOnRight) {
        // Currently on right (backlight on) - move to left (cabin shake on)
        switchHandle.style.transform = 'translate(0)';
        updateCabinShakeState(true);
      } else {
        // Currently on left (cabin shake on) - move to right (backlight on)
        switchHandle.style.transform = 'translate(100%)';
        updateCabinShakeState(false);
      }
    });
  }
});

