let participantNodes = [];
let visibleParticipants = [];
let visibleShareScreen = 0;
// Initialize the SDK with the access token
const initializeVoxeetSDK = () => {
  // Load the settings injected by the mixer
  const accessToken = $("#accessToken").val();
  const refreshToken = $("#refreshToken").val();
  const refreshUrl = $("#refreshUrl").val();

  var formElement = document.getElementById("form");
  formElement.classList.add("hide");

  // Reference: https://dolby.io/developers/interactivity-apis/client-sdk/reference-javascript/voxeetsdk#static-initializetoken
  VoxeetSDK.initializeToken(accessToken, () =>
    fetch(refreshUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: { refresh_token: refreshToken },
    })
      .then((data) => data.json())
      .then((json) => json.access_token)
  );
};

const suscribeToRecordingEvents = (conferenceId) => {
  const suscribe = () => {
    const eventSource = new EventSource(
      `https://stagingnode.theirstory.io/dolby/events/${conferenceId}`
    );
    eventSource.onmessage = function (event) {
      console.log("event", event.data);
      visibleParticipants = JSON.parse(event.data).participants;
      console.log(visibleParticipants);
      toggleVisibility(visibleParticipants);
    };

    eventSource.onerror = function (err) {
      setTimeout(suscribe, 5000);
    };
  };
  suscribe();
};

const joinConference = () => {
  // Initialize the SDK
  initializeVoxeetSDK();

  // Load the settings injected by the mixer
  const catToken = $("#catToken").val();
  const conferenceId = $("#conferenceId").val();
  const thirdPartyId = $("#thirdPartyId").val();
  const layoutType = $("#layoutType").val();

  const mixer = {
    name: "Mixer",
    externalId: "Mixer_" + layoutType,
    thirdPartyId: thirdPartyId,
  };

  const joinOptions = {
    conferenceAccessToken: catToken && catToken.length > 0 ? catToken : null,
    constraints: {
      video: false,
      audio: false,
    },
    mixing: {
      enabled: true,
    },
    userParams: {},
  };

  // Open a session for the mixer
  VoxeetSDK.session
    .open(mixer)
    .then(() => VoxeetSDK.conference.fetch(conferenceId))
    // Join the conference
    .then((conference) => {
      VoxeetSDK.conference.join(conference, joinOptions);
      suscribeToRecordingEvents(conferenceId);
    })
    .catch((err) => console.error(err));
};

const replayConference = () => {
  // Initialize the SDK
  initializeVoxeetSDK();

  // Load the settings injected by the mixer
  const catToken = $("#catToken").val();
  const conferenceId = $("#conferenceId").val();
  const thirdPartyId = $("#thirdPartyId").val();
  const layoutType = $("#layoutType").val();

  const mixer = {
    name: "Mixer",
    externalId: "Mixer_" + layoutType,
    thirdPartyId: thirdPartyId,
  };

  const replayOptions = {
    conferenceAccessToken: catToken && catToken.length > 0 ? catToken : null,
    offset: 0,
  };

  // Open a session for the mixer
  VoxeetSDK.session
    .open(mixer)
    .then(() => VoxeetSDK.conference.fetch(conferenceId))
    // Replay the conference from the beginning
    .then((conference) => {
      VoxeetSDK.conference.replay(conference, replayOptions, { enabled: true });
      suscribeToRecordingEvents(conferenceId);
    })
    .catch((err) => console.error(err));
};

const resizeVideos = () => {
  const newWidth = (
    1920 / Math.ceil(Math.sqrt(visibleParticipants.length + visibleShareScreen))
  ).toString();
  const newHeight = (
    1080 / Math.ceil(Math.sqrt(visibleParticipants.length + visibleShareScreen))
  ).toString();
  participantNodes.map((p) => {
    console.log(p);
    if (p === "screenshare") {
      const node = $(`#${p}`);
      node.css("width", `${newWidth}px`);
    } else {
      const node = $("#participant-" + p);
      node.css("width", `${newWidth}px`);
      node.find("video").css("height", `${newHeight}px`)
    }
  });
};

// Add the video stream to the web page
const addVideoNode = (participant, stream) => {
  let participantNode = $("#participant-" + participant.id);
  if (!participantNodes.includes(participant.id)) {
    participantNodes.push(participant.id);
  }
  const isVisible = visibleParticipants.find((p) => p === participant.id);
  if (!participantNode.length) {
    participantNode = $("<div />")
      .attr("id", "participant-" + participant.id)
      .addClass("container")
      .appendTo("#videos-container");
    if (!isVisible && !participantNode.hasClass("exclude")) {
      participantNode.addClass("exclude");
    }

    $("<video autoplay playsInline muted />").appendTo(participantNode);
  }
  resizeVideos();
  // Attach the stream to the video element
  navigator.attachMediaStream(participantNode.find("video").get(0), stream);
};

const addScreenShareNode = (stream) => {
  console.log(participantNodes);
  console.log(visibleParticipants);
  participantNodes.push("screenshare");
  visibleShareScreen = 1;
  let screenshareNode = $("<div />")
    .attr("id", "screenshare")
    .appendTo("#videos-container");

  let container = $("<div />").addClass("container").appendTo(screenshareNode);

  let videoNode = $("<video autoplay playsInline muted />").appendTo(container);
  resizeVideos();
  // Attach the stream to the video element
  navigator.attachMediaStream(videoNode.get(0), stream);
};

const removeScreenShareNode = () => {
  participantNodes = participantNodes.filter(function (element) {
    return element !== "screenshare";
  });
  visibleShareScreen = 0;
  $("#screenshare").remove();
  resizeVideos();
};

const toggleVisibility = (participants) => {
  participantNodes.forEach((p) => {
    const node = $(`#participant-${p}`);
    if (node.length) {
      if (visibleParticipants.includes(p)) {
        node.removeClass("exclude");
      } else {
        node.addClass("exclude");
      }
    }
  });
  resizeVideos();
};

// Remove the video stream from the web page
const removeVideoNode = (participant) => {
  participantNodes = participantNodes.filter(function (element) {
    return element !== participant.id;
  });
  $("#participant-" + participant.id).remove();
  resizeVideos();
};

// Add a Video player to the web page
const addVideoPlayer = (videoUrl) => {
  $("<video autoplay playsinline />")
    .attr("id", "video-url-player")
    .attr("src", videoUrl)
    .appendTo("body");
};

// Move the cursor in the video
const seekVideoPlayer = (timestamp) => {
  $("#video-url-player")[0].currentTime = timestamp;
};

// Pause the video
const pauseVideoPlayer = () => {
  $("#video-url-player")[0].pause();
};

// Play the video
const playVideoPlayer = () => {
  $("#video-url-player")[0].play();
};

// Remove the Video player from the web page
const removeVideoPlayer = () => {
  $("#video-url-player").remove();
};

/*
 * Let the mixer know when the conference has ended.
 */
const onConferenceEnded = () => {
  $("#conferenceStartedVoxeet").remove();
  $("body").append('<div id="conferenceEndedVoxeet"></div>');
};

VoxeetSDK.conference.on("left", onConferenceEnded);
VoxeetSDK.conference.on("ended", onConferenceEnded);

$(document).ready(() => {
  $("#joinConference").click(joinConference);
  $("#replayConference").click(replayConference);

  const layoutType = $("layoutType").val();
  if (layoutType === "stream" || layoutType === "hls") {
    // Display the live message for the live streams
    $("#live").removeClass("hide");
  }

  // Inform the mixer that the application is ready to start
  $("<div />").attr("id", "conferenceStartedVoxeet").appendTo("body");

  // Initialize the SDK
  // Please read the documentation at:
  // https://docs.dolby.io/communications-apis/docs/initializing-javascript
  // Insert your client access token (from the Dolby.io dashboard) and conference id

  // Comment this block after test
  ///////////TEST//////////////
  // const clientAccessToken =
  //   "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkb2xieS5pbyIsImlhdCI6MTY5MDgzNTQzMSwic3ViIjoiNDQ4b19vSHNmaXIxMTVpcV9mRDRmUT09IiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9DVVNUT01FUiJdLCJ0YXJnZXQiOiJzZXNzaW9uIiwib2lkIjoiMDQ4MTVjODUtNmE3MC00OGE5LWFhNTYtNzFmNTJlNjM0MjZhIiwiYWlkIjoiNmY4MDlhZjAtOTIwZi00NDcwLWJiYjItMGVhMDg1MjBiNGVkIiwiYmlkIjoiOGEzNjgwNjM3ZTc1ODZmOTAxN2U3YTA2MjZmYzNhZDgiLCJleHAiOjE2OTA4MzkwMzF9.D24N2VP05v_r-WSVNQmSRwmsQeIOGNOiPPS2fd28Esu4F6ClfI7INw3UhmDoQCkNAKt2fiAGdhibD9auaqM7YQ";
  // const conferenceId = "326abf2b-bf66-44ca-a27d-83a02907f37b";

  // VoxeetSDK.initializeToken(clientAccessToken, (isExpired) => {
  //   return new Promise((resolve, reject) => {
  //     if (isExpired) {
  //       reject("The client access token has expired.");
  //     } else {
  //       resolve(clientAccessToken);
  //     }
  //   });
  // });

  // const mixer = { name: "Test", externalId: "Test" };
  // const joinOptions = { constraints: { video: false, audio: false } };

  // // Open a session for the mixer
  // VoxeetSDK.session
  //   .open(mixer)
  //   .then(() => VoxeetSDK.conference.fetch(conferenceId))
  //   // Join the conference
  //   .then((conference) => {
  //     VoxeetSDK.conference.join(conference, joinOptions);
  //     suscribeToRecordingEvents(conferenceId);
  //   })
  //   .catch((err) => console.error(err));
  /////////////TEST//////////////
});
