// This background script is for adding the back to abstract button.
var app = {};
app.name = "[arXiv-utils]";
app.pdfviewer = "pdfviewer.html"
// The match pattern for the URLs to redirect
// Note: https://arxiv.org/pdf/<id> is the direct link, then the url is renamed to https://arxiv.org/pdf/<id>.pdf
//       we capture only the last url (the one that ends with '.pdf').
app.bookmarkPattern = "*://arxiv.org/pdf/*.pdf";
// Return the type parsed from the url.
app.getType = function (url) {
  if (url.endsWith(".pdf")) {
    return "PDF";
  }
  return "Abstract";
}
// Open the abstract page using the PDF URL.
app.openAbstractTab = function (activeTabIdx, url, type) {
  // Retrieve the abstract url by modifying the PDF url.
  var newURL;
  if (type === "PDF") {
    newURL = url.replace('.pdf', '').replace('pdf', 'abs');
  } else {
    newURL = url.replace('abs', 'pdf') + ".pdf";
  }
  // Create the abstract page in new tab.
  chrome.tabs.create({ "url": newURL }, (tab) => {
    console.log(app.name, "Opened abstract page in new tab.");
    // Move the target tab next to the active tab.
    chrome.tabs.move(tab.id, {
      index: activeTabIdx + 1
    }, function (tab) {
      console.log(app.name, "Moved abstract tab.");
    });
  });
}
// Check if the URL is abstract or PFD page.
app.checkURL = function (url) {
  var matchPDF = url.match(/arxiv.org\/pdf\/([\S]*)\.pdf$/);
  var matchAbs = url.match(/arxiv.org\/abs\/([\S]*)$/);
  if (matchPDF !== null || matchAbs !== null) {
    return true;
  }
  return false;
}
// Called when the url of a tab changes.
app.updateBrowserActionState = function (tabId, changeInfo, tab) {
  var avail = app.checkURL(tab.url)
  if (avail) {
    chrome.browserAction.enable(tabId);
  } else {
    chrome.browserAction.disable(tabId);
  }
};
// Redirect to custom PDF page.
app.redirect = function (requestDetails) {
  if (requestDetails.documentUrl !== undefined) {
    // Request from this plugin itself.
    return;
  }
  url = app.pdfviewer + "?target=" + requestDetails.url;
  url = chrome.runtime.getURL(url);
  console.log(app.name, "Redirecting: " + requestDetails.url + " to " + url);
  // chrome.tabs.create({ "url": url });
  return {
    /*cancel: true*/
    redirectUrl: url
  };
}
// If the custom PDF page is bookmarked, bookmark the original PDF link instead.
app.modifyBookmark = function (id, bookmarkInfo) {
  var prefix = chrome.runtime.getURL(app.pdfviewer + "?target=");
  if (!bookmarkInfo.url.startsWith(prefix)) {
    return;
  }
  console.log(app.name, "Updating bookmark with id: " + id + ", url: " + bookmarkInfo.url);
  var url = bookmarkInfo.url.substr(prefix.length);
  chrome.bookmarks.update(id, {
    url: url
  }, () => {
    console.log(app.name, "Updated bookmark with id: " + id + " to URL: " + url);
  });
}
// Run this when the button clicked.
app.run = function (tab) {
  if (!app.checkURL(tab.url)) {
    console.log(app.name, "Error: Not arXiv page.");
    return;
  }
  var type = app.getType(tab.url);
  app.openAbstractTab(tab.index, tab.url, type);
}
// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(app.updateBrowserActionState);
// Extension button click to modify title.
chrome.browserAction.onClicked.addListener(app.run);
// Redirect the PDF page to custom page.
chrome.webRequest.onBeforeRequest.addListener(
  app.redirect,
  { urls: [app.bookmarkPattern] },
  ["blocking"]
);
// Capture bookmarking custom PDF page.
chrome.bookmarks.onCreated.addListener(app.modifyBookmark);