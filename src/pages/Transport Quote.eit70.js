// File: pageCode.js
import { authentication, currentMember } from 'wix-members-frontend';
import wixData from 'wix-data';
import {
  getOrCreateThreadForUser,
  uploadFileToAssistants,
  userSendMessage
} from 'backend/assistants.jsw';

// The name of your collection
const COLLECTION_NAME = "TransportQuote";

$w.onReady(function () {
  // Collapse the iframe & send stack initially
  $w('#responseGPT').collapse();
  $w('#sendStack').collapse();

  // “Get Quote” button
  $w('#quoteGPT').onClick(async () => {
    const emailVal = $w('#emailGPT').value;
    if (!emailVal) return;

    // 1) See if user is logged in
    let memberObj = await currentMember.getMember();
    let memberId;
    if (memberObj) {
      memberId = memberObj._id; 
    } else {
      // Not logged in
      memberId = `guest-${Date.now()}`;
    }

    // 2) get or create thread in “TransportQuote”
    let record = await getOrCreateThreadForUser(memberId, emailVal);

    // 3) collapse #emailStack etc., expand chat UI
    $w('#emailStack').collapse();
    $w('#transportHeader').collapse();
    $w('#transportSubHeader').collapse();
    $w('#responseGPT').expand();
    $w('#sendStack').expand();

    // 4) Set iFrame src, scrolling
    $w('#responseGPT').src = "https://github.com/NORA-BITSY/Wix-Boatable-App/main/root/chatIframe.html";
    $w('#responseGPT').scrolling = "yes";

    // 5) Post user’s opening message to the iFrame
    postToIFrame("USER_MESSAGE", `I'd like to discuss a quote for boat transport. My email is ${emailVal}.`);
    postToIFrame("SHOW_WAITING", "");

    // 6) Actually call userSendMessage
    let botReply;
    try {
      botReply = await userSendMessage(
        record.threadId,
        `I'd like to discuss a quote for boat transport. My email is ${emailVal}.`
      );
    } catch (err) {
      console.error(err);
      botReply = "Error contacting the AI. Please try again.";
    }

    // 7) Hide waiting, show bot reply
    postToIFrame("HIDE_WAITING", "");
    postToIFrame("BOT_MESSAGE", botReply);

    // 8) Optionally store transcript
    await appendTranscript(record._id, `User: I'd like to discuss a quote...\nAssistant: ${botReply}`);
  });

  // “Send” button
  $w('#sendGPT').onClick(async () => {
    const promptVal = $w('#promptGPT').value.trim();
    if (!promptVal) return;

    // 1) show user’s message + show waiting
    postToIFrame("USER_MESSAGE", promptVal);
    postToIFrame("SHOW_WAITING", "");

    // 2) see if there's an attached image
    const uploads = $w('#attachGPT').value; // array of UploadButtonFile objects
    let fileIds = [];
    if (uploads && uploads.length > 0) {
      for (let f of uploads) {
        try {
          // Convert to base64
          const base64String = await fileToBase64(f);
          const newFileId = await uploadFileToAssistants(f.name, base64String);
          fileIds.push(newFileId);

          // Optionally store reference in attachments array
          await addAttachmentRef(f.name, newFileId);
        } catch (uploadErr) {
          console.error("File upload error", uploadErr);
        }
      }
    }

    // 3) get the user’s record => threadId
    const emailVal = $w('#emailGPT').value;
    let memberObj = await currentMember.getMember();
    let memberId = memberObj ? memberObj._id : `guest-${Date.now()}`;
    let rec = await getOrCreateThreadForUser(memberId, emailVal);

    // 4) Send the message to the assistant
    let botReply;
    try {
      botReply = await userSendMessage(rec.threadId, promptVal, fileIds);
    } catch (err) {
      console.error(err);
      botReply = "Error from AI. Please try again.";
    }

    postToIFrame("HIDE_WAITING", "");
    postToIFrame("BOT_MESSAGE", botReply);

    // 5) clear user input
    $w('#promptGPT').value = "";
    $w('#attachGPT').reset();

    // 6) store transcript
    await appendTranscript(rec._id, `User: ${promptVal}\nAssistant: ${botReply}`);
  });
});

/** Utility to pass message object to the IFrame */
function postToIFrame(type, message) {
  $w('#responseGPT').postMessage({ type, message });
}

/** Store appended transcript in DB. */
async function appendTranscript(itemId, text) {
  let data = await wixData.get(COLLECTION_NAME, itemId);
  data.chatTranscript = (data.chatTranscript || "") + "\n" + text;
  await wixData.update(COLLECTION_NAME, data);
}

/** Example: push an attachment reference to attachments array. 
 *  For a real app, you'd store specifically in the user’s record.
 */
async function addAttachmentRef(filename, fileId) {
  let q = await wixData.query(COLLECTION_NAME).limit(1).find();
  if (q.items.length > 0) {
    let it = q.items[0];
    let arr = it.attachments || [];
    arr.push({ filename, fileId });
    it.attachments = arr;
    await wixData.update(COLLECTION_NAME, it);
  }
}

/** Convert an UploadButtonFile to base64. */
async function fileToBase64(fileObj) {
  const arrayBuffer = await fileObj.arrayBuffer();
  let binaryStr = "";
  let uint8 = new Uint8Array(arrayBuffer);
  for (let i=0; i<uint8.length; i++) {
    binaryStr += String.fromCharCode(uint8[i]);
  }
  return btoa(binaryStr);
}
