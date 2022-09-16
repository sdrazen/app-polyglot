const fetch = require('node-fetch');
// note: use npm install node-fetch@2.0 to be able to use "require"

function translateText (text, targetLanguage, googleTranslateProxy, googleTranslateApiKey) {

  let body = {
      'q' : text,
      'target': targetLanguage
  };

  let translatedText = "";

  return new Promise((resolve, reject) => {

    fetch(`${googleTranslateProxy}https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
            // fyi, NO need for content length
        }
    })
        .then(res => res.json())
        .then(json => {translatedText = json.data.translations[0].translatedText; resolve(translatedText);})
        .catch (err => {console.log(err); reject(err);})

  })

}

async function tInit(langId, pathName, tConfig, doTranslate, googleTranslateApiKey) {

  try {
    if (tConfig.translationdata.length == 0 || tConfig.initoptions.force == true) {
      // No translation data or force is set to true, so let's collect data
      let pathNames = tConfig.initoptions.pathnames;
      // Find index of this array element
      let pathNameIndex = pathNames.findIndex(el => el == pathName);
      // If it's a first page, clear local storage. Or currentpageonly is set to true.
      if (pathNameIndex == 0 || tConfig.initoptions.currentpageonly == true) { localStorage.clear() };
      // Collect all relevant data for page
      await tElements(pathName, tConfig, googleTranslateApiKey);
      // Find next element's index in array
      let pathNameNextIndex = pathNameIndex + 1;
      if (pathNames.length > pathNameNextIndex && tConfig.initoptions.currentpageonly == false) {
        // Next element exists, so navigate to it
        let pathNextName = pathNames[pathNameNextIndex];
        if (window.location.href !== `${tConfig.initoptions.protocol}${tConfig.initoptions.host}${pathNextName}`) {
          window.location.href = `${tConfig.initoptions.protocol}${tConfig.initoptions.host}${pathNextName}`;
        }
      } else {
        // This was last element of an array, show results in JSON format and return
        let ret = {translationdata: JSON.parse(localStorage.getItem('gTranslationData'))};
        console.log(JSON.stringify(ret));
        // We will not clear local storage because it's an alternative way for front-end to grab the data
        // besides previous console.log line. Local storage will be cleared anyway if new initialization starts
        // (due to option force = true or if user manually deletes data from his json config).
        // localStorage.clear();
        return ret;
      }
    } else {
      // Translation data exists, so let's translate page if doTranslate is set to true
      if (doTranslate) {
        let ret = tTranslate(langId, pathName, tConfig);
        return ret
      } else {
        return {success: true, message: "Not translated because tTranslate parameter is set to false"};
      }
    }
  }
  catch {err => {
    localStorage.clear();
    console.log("Error tInit(): " + err);
  }}
}

async function tElements (pathName, tConfig, googleTranslateApiKey) {

  let ret = {};
  let arrElements = [];
  let translationsArr = [];

  let langClass = tConfig.translationoptions.classname;
  let langArr = tConfig.initoptions.languages;

  // langClass = ".translate"
  // langArr = [{ id: 0, code: "hr", text: "Croatian" }, { id: 1, code: "de", text: "German" }];

  langArr.forEach(lang =>
    translationsArr.push({ langid: lang.id, langcode: lang.code, langtext: lang.text, translation: "" })
  )

  let items = document.querySelectorAll(langClass);

  return new Promise((resolve, reject) => {

    // Use local storage to temporarily save data between function calls from different pages
    let tempArray = [];
    if (localStorage.getItem('gTranslationData') != null) {
      tempArray = JSON.parse(localStorage.getItem('gTranslationData'));
    }

    try {
        for (const [idx, item] of items.entries()) {
          if (tConfig.initoptions.googletranslate.enable == false) {
            // No google translate
            arrElements.push(
              {
                id: item.id,
                dotranslate: item.id !=="" ? true: false,
                innerhtml: item.innerHTML,
                translations: translationsArr
              }
            )
            if (items.length == arrElements.length) {
              tempArray.push({ page: pathName, elements: arrElements });
              localStorage.setItem('gTranslationData', JSON.stringify(tempArray));
              resolve();
            }
          } else {
            // Google translate
            for (const [langIdx, lang] of langArr.entries()) {
              let googleTranslation = "";
              translateText(item.innerHTML, lang.code, tConfig.initoptions.googletranslate.proxy, googleTranslateApiKey)
                .then((res) => {googleTranslation = res;console.log(res);})
                .then(() => {translationsArr = []; translationsArr[langIdx] = { langid: lang.id, langcode: lang.code, langtext: lang.text, translation: googleTranslation }; })
                .then(() => {
                  let el = arrElements[idx];
                  if (!el) {
                    arrElements[idx] = 
                      {
                        id: item.id,
                        dotranslate: item.id !=="" ? true: false,
                        innerhtml: item.innerHTML,
                        translations: translationsArr
                      }
                  } else {
                    if (arrElements[idx]["translations"] !== undefined) {
                      arrElements[idx].translations[langIdx] = translationsArr[langIdx];
                      translationsArr = [];
                    } else {
                      arrElements[idx]["translations"][langIdx] = translationsArr;
                      translationsArr = [];
                    }
                  }
                })
                .then(() => {
                  if (items.length == arrElements.reduce(c => c + 1, 0) && arrElements[idx].translations.reduce(c => c + 1, 0) == langArr.length) {
                    tempArray.push({ page: pathName, elements: arrElements });
                    localStorage.setItem('gTranslationData', JSON.stringify(tempArray));
                    resolve();
                  }
                })
                .catch((err) => {console.log("Error Google Translate: " + err);});
            }

          }
        };

    }
    catch {err =>
      console.log("Error tElements(): " + err);
      return {error: "Error tElements(): " + err};

    }
    
  })

};

function tTranslate(langId, pathName, tConfig) {

  let ret = {};
  let retErrors = [];
  let retWarnings = [];
  let items = document.querySelectorAll(tConfig.translationoptions.classname);
  let translationData = tConfig.translationdata.find(el => el.page == pathName);
  let elements = translationData?.elements;

  if (!elements) {
    // No elements data for that page, return
    retErrors.push({error: "No elements defined for page " + pathName});
    ret = {success: retErrors.length==0 ? true : false, errors: retErrors, warnings: retWarnings};
    console.log(ret);
    return ret;
  }

  if (!translationData) {
    // No translation data for that page, return
    retErrors.push({error: "No translation definition for page " + pathName});
    ret = {success: retErrors.length==0 ? true : false, errors: retErrors, warnings: retWarnings};
    console.log(ret);
    return ret;
  }

  try {
    items.forEach(item => {
      let chunk = elements.find(el => el.id == item.id && el.dotranslate == true);
      if (chunk) {
        if (chunk.id == "") {
          retWarnings.push({warning: "Element has no id defined and dotranslate is set to true. Element will not be translated. InnerHTML: " + chunk.innerhtml});
        } else {
          let translationSection = chunk.translations.find(el => el.langid == langId);
          if (translationSection) {
            if (chunk.translations[langId].translation == "") {
              if (tConfig.translationoptions.translateblanks == true) {
                item.innerHTML = chunk.translations[langId].translation;
              } else {
                retWarnings.push({warning: "Element with id " + item.id + " has no translation defined for langid " + langId + " so it will not be translated because translateblanks is set to false"});
              }
            } else {
              item.innerHTML = chunk.translations[langId].translation;
            }
          } else {
            retErrors.push({error: "No translation definition with langid " + langId + " for element with id " + item.id});
          }
        }
      }
    });
  }
  catch {err =>
    console.log("Error tTranslate(): " + err);
    return {error: "Error tTranslate(): " + err};
  }

  ret = {success: retErrors.length==0 ? true : false, errors: retErrors, warnings: retWarnings};

  console.log(ret);

  return ret;

};

module.exports = {
  tInit
}