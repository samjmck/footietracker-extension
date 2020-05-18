npm run build
zip -r builds/dist-chrome.zip dist-chrome/*
zip -r builds/dist-standard-webextension.zip dist-standard-webextension/*

# For source code folder
mkdir .temp_build
mv dist-chrome/manifest.json .temp_build/chrome-manifest.json
mv dist-standard-webextension/manifest.json .temp_build/standard-webextension-manifest.json
rm -r dist-chrome/*
rm -r dist-standard-webextension/*
zip -r builds/source-code.zip . -x node_modules/\* -x .DS_Store -x .git/\* -x builds/\*
mv .temp_build/chrome-manifest.json dist-chrome/manifest.json
mv .temp_build/standard-webextension-manifest.json dist-standard-webextension/manifest.json
rm -rf .temp_build
