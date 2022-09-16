# App Polyglot

This npm package translates your application easily and quickly to any number of different languages. It prepares everything for your **custom translations** or uses **Google Translation** service for automatic translations if you choose so (the latter requires your Google Translate API key).

## Installing

```bash
npm install app-polyglot
```

## Dependencies

- `node-fetch`
- `cors-anywhere`

## Prerequisites

**Only** if you choose to use automatic translations you will need:

- `Google Translation API key`: needed for automatic translations using Google Translation service
- `Proxy`: needed to avoid CORS issues while making requests to Google Translation service

## Getting started

This is how the whole cycle works:

1. [Prepare configuration in a \*.json file](###-1.-prepare-configuration-in-a-json-file)
2. [Prepare app for translations](###-2.-prepare-app-for-translations)
3. [Make function call to do the rest](###-3.-make-function-call-to-do-the-rest)
4. [Use returned results in your app](###-4.-use-returned-results-in-your-app)

### 1. Prepare configuration in a json file

There are some settings which are not going to change frequently. We will configure them in a _json_ file which we will first create at any accessible location under any file name. Common place for those kind of data for Angular users is `/assets/json`. In our example we used a file name `tConfig.json` located in the folder `/assets/json`. That file initially looks like this:

```json
{
  "initoptions": {
    "protocol": "http://",
    "host": "localhost:4200",
    "pathnames": ["/home"],
    "languages": [
      {
        "id": 0,
        "code": "hr",
        "text": "Croatian"
      },
      {
        "id": 1,
        "code": "de",
        "text": "German"
      }
    ],
    "currentpageonly": false,
    "force": false,
    "googletranslate": {
      "enable": false,
      "proxy": "http://localhost:8080/"
    }
  },
  "translationoptions": {
    "classname": ".translate",
    "translateblanks": true
  },
  "translationdata": []
}
```

This _json_ contains elements which allow us to define how the package behaves when we call its function. There are three main elements and all other ones provide more detailed options for each one of them. Those are `initoptions`, `translationoptions` and `translationdata`.

- `initoptions`: : defines how the package will behave in the stage of collecting, preparing and translating elements when we don't have any translation data yet

  - `protocol`: http:// or https:// - self-explanatory
  - `host`: Host - self-explanatory
  - `pathnames`: Array of component(s) / page(s) you want to be translated. Package will navigate to each one of them and prepare all data in one step.
  - `languages`: Array of desired languages of which each contains `id`, `code` and `text`. If you choose to use Google Translate for automatic translations, make sure that `code` actually contains a valid [language code](https://cloud.google.com/translate/docs/languages).
  - `currentpageonly`: Prepares data only for the page your browser is currently on, regardless of an array defined in `pathnames`. Default value is `false`.
  - `force`: Forces new data collection and preparation, regardless of the fact we might already have our translations ready from before. Forcing new data collection, preparation and even repeated Google translation won't have any effect or change anything in your app until you choose to actually apply those new results as your new `translationdata` (more on that later in this section). Default is `false`.
  - `googletranslate`: If you want to collect, prepare and translate all data automatically in one go using Google Translate, set `enable` to `true` (default is `false`). Make sure to provide your Google Translate API key and also define `proxy` or just leave it as `http://localhost:8080/` (default) and use `nodemon` and `cors-anywhere` as _`nodemon cors 8080`_. This will enable your `http://localhost:8080/` to act as a proxy. Make sure to include the last _backslash_ in your proxy url setting.

- `translationoptions`: defines how the package will behave when applying our translation data

  - `classname`: This is a class name which is used to mark elements in our component(s) / page(s) to be translated. Previous initialization and data collection stage actually used this setting to include only elements with this class name in the final returned _json_ result. Make sure to include the first _dot_ in your class name setting. Default is `.translate`.
  - `translateblanks`: This setting defines how the package behaves if some translation text is empty string. Default is `true` which means that any text translated as empty string will actually be translated as empty string, intentionally or not. If you set this value to `false`, that text will not be translated, it will be left with an original text.

- `translationdata`: all translation data itself
  - Here We place the results of the package's `tInit` function. As this element accepts array, make sure you paste the array and not an object. In other words, pay attention to curly braces and brackets of the returned result.

### 2. Prepare app for translations

First you need to somehow mark elements to be translated in your component(s) / page(s). You can do that by setting that element to use a certain class. Also make sure that all elements to be translated have a unique _`id`_ for that component. This is important because everything will work autmatically and the only way the package can later distinguish one element from another is using its _`id`_. This also avoids the need to change your original text in any way within that element. This is an example of preparing your component / page in Angular where we use some _`id`_ and _`class`_ with name "_translate_":

```javascript
<!-- Title -->
<h1 id="id_0001" class="caption translate">List of categories and articles</h1>
```

In this example we use some unique id (_`id_0001`_) and class with name _`translate`_. That class may or may not actually be present in our _css_, it doesn't matter. Note that we didn't make changes to our original text in any way. This makes it very simple to revert you whole application to not use this package if you choose to do so at some later point in time for any reason. Just remove the class _`translate`_ from your elements and you are done, everything is how it was before.

### 3. Make function call to do the rest

Now that we have prepared _html_ in our component(s) / page(s), we can make a call to a function to do the magic. There is only one function to call, the _`tInit`_ function. It always returns _json_ as result and this very same function call serves two purposes depending on the context it is called in:

- if it detects that there are no translations for your component(s) yet, it will prepare and return a _json_ result which you can use to either manually translate every element in your component(s) or already use those results if you called the function telling it that you want to do it automatically through Google Translate service

- if it detects already existing translations, it will use them and translate every element to language of choice during runtime

But first we have to declare the package in our component. Here is an example in Angular:

```javascript
///////////////////////
// Translations imports
///////////////////////
import tConfig from "../assets/json/tConfig.json";
import { tInit } from "../../node_modules/app-polyglot";
```

Here we make two imports: one for the _json_ file which contains all our configuration parameters and the second one for us to be able to use the functionalities of the package.

Before the call we can set some variables which will dictate how the package's functionalities behave:

```javascript
(...)

export class HomeComponent implements OnInit, AfterViewInit {

  /////////////////////////
  // Translations variables
  /////////////////////////
  tLangId: number = 0;
  tPathName: string = "/home";
  tDoTranslate: boolean = true;
  tGoogleTranslateApiKey: string = "YOUR-GOOGLE-TRANSLATE-API-KEY";
  tRet: any = {};

  constructor() { }

  (...)
```

- `tLangId`: This is a language identifier to translate your component to. It's purpose is to be able to change it's value at runtime at any time for a different language. It has effect only while applying translations to our app with already existing translation data. If translations are not yet existing, you can leave this variable as it is.
- `tPathName`: This is a path name for that component or static page. It's just the last part of the whole url. Because this example shows preparation of the `HomeComponent`, our path name will be `/home`. Other examples would be `/about` if our component was the `AboutComponent`. Or maybe `/contact.html` if we don't use Angular but some static _html_ files. This parameter could also accept Angular's Activated Route like this: `/article/${parseInt(this.activatedRoute.snapshot.paramMap.get("id"))}` so our final path names would be depending on the url's `id` parameter: `/article/1`, `/article/2`, `/article/3` and so on.
- `tDoTranslate`: Sometimes we don't want to apply prepared translations to our application for any reason. To avoid making any other changes, in that case we can just set this variable to `false`. If translations are not yet existing, you can leave this variable as it is.
- `tGoogleTranslateApiKey`: If you want to automatically prepare translations instead of manually translating every element, you will need a [Google Translation API key](https://cloud.google.com/translate/docs/setup).
- `tRet`: This is a _json_ object returned from the package's only function `tInit`.

Now we can actually call the _`tInit`_ function like this (Angular example):

```javascript
  (...)

  ngAfterViewInit(): void {

    ///////////////////////////////
    // Translations initialzization
    ///////////////////////////////
    this.tRet = tInit(this.tLangId, this.tPathName, tConfig, this.tDoTranslate, this.tGoogleTranslateApiKey);

  }

  (...)
```

**Very important**: note how we put the call to a function in the Angular's `ngAfterViewInit()` lifecycle method. This ensures that the function call happens only once, when the browser fully renders our component. Not twice or many times. It would potentially lead to ininite loops which you **do not** want to happen. For example `ngDoCheck()` or `ngAfterViewChecked()` would be bad choices as they would be triggered many times. If you don't use Angular, it's advisable to wisely choose the location where the function call happens from. In short, function call should happen only once, after our page is ready in the browser. Again, Angular's `ngOnInit()` wouldn't be a good choice because our dynamic content - if we have some interpolated variable values in our _html_ template, for example - is not ready yet in the browser at that point in time.

### 4. Use returned results in your app

The `tInit` function always returns _json_. Depending on the context, it will return different results.

If we call the function for the first time to prepare our translation data, it will return a _json_ object with all elements prepared for our manual translations or already translated through Google Translate API service if we chose to use it. We can access this result in three possible ways:

- it will be visible in the browser's console window
- it will be accessible in the Storage section of our browser (LocalStorage)
- it will be returned to our `tRet` variable which we already have declared to hold return values from the function call

This is the most important stage of the whole process because it prepares everything we have defined to be prepared. After that we can simply leave the package do its thing and apply those translations _on-the-go_.

If, on the other hand, we already have our translations prepared and just want to apply them to our app, this return value will hold information about success, potential errors or warnings.

## Usage

Now that we carefully prepared imports and variables, placed our call to the package to an appropriate place and have the big _json_ object returned, what do we do with it, how do we actually make use of the returned result?

We place the result to the `translationdata` element of our `tConfig.json` file. As this element accepts array, make sure you paste the array and not an object. In other words, pay attention to curly braces and brackets of the returned result.

Following our example with the Angular's `HomeComponent`, our final whole `tConfig.json` file will look like this with those defined parameters (only the `translationdata` changed, everything else is like it was before):

```json
{
  "initoptions": {
    "protocol": "http://",
    "host": "localhost:4200",
    "pathnames": ["/home"],
    "languages": [
      {
        "id": 0,
        "code": "hr",
        "text": "Croatian"
      },
      {
        "id": 1,
        "code": "de",
        "text": "German"
      }
    ],
    "currentpageonly": false,
    "force": false,
    "googletranslate": {
      "enable": false,
      "proxy": "http://localhost:8080/"
    }
  },
  "translationoptions": {
    "classname": ".translate",
    "translateblanks": true
  },
  "translationdata": [
    {
      "page": "/home",
      "elements": [
        {
          "id": "id_0001",
          "dotranslate": true,
          "innerhtml": "List of categories and articles",
          "translations": [
            {
              "langid": 0,
              "langcode": "hr",
              "langtext": "Croatian",
              "translation": "Popis kategorija i članaka"
            },
            {
              "langid": 1,
              "langcode": "de",
              "langtext": "German",
              "translation": "Liste der Kategorien und Artikel"
            }
          ]
        }
      ]
    }
  ]
}
```

After saving changes to our _json_ file, your application is finally ready to actually apply all defined translations. As we now have all data ready, the call to the package's `tInit` function this time will not collect or prepare anything but apply the defined translations. That same call

```javascript
this.tRet = tInit(this.tLangId, this.tPathName, tConfig, this.tDoTranslate, this.tGoogleTranslateApiKey);
```

will translate our `/home` component to Croatian language because our `tLangId` is set to _0_ and we defined `id` for Croatian language as _0_ in `tConfig.json`. If we choose to apply German translations, we would simply set `tLangId` to _1_ because we defined `id` for German language as 1 in `tConfig.json`. If we at some point don't want to translate any text but leave everything as it was originally (English in our example), we would just set our `tDoTranslate` variable to `false`. That was the whole point of leaving some variables to be defined in the component and not in _json_ configuration file - to be able to change language and other behaviour quickly and easily before making a call to a package's function `tInit`.
