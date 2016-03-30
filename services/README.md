services.peter.sh
=================
This repository contains the code powering [services.peter.sh](https://services.peter.sh/).

The purpose of this website is to ensure that the data used on various other parts of [peter.sh](https://peter.sh/) is available and up to date, whilst making sure that any problems are quickly identified so that they can be resolved.

There are a number of services included in this repository.

* **auto-deploy**. Updates the local Git checkout when changes have been pushed to the GitHub repository.
* **command-line-flags**. Tracks and indexes the command line flags available to Chromium and Google Chrome.
* **css-properties**. Tracks the list of CSS properties supported by Blink, Gecko and WebKit. Trident has to be updated manually.
* **repository-tracker**. Tracks all commits to the Blink, Chromium, Skia and v8 repositories and stores them in a MySQL database.
* **service-monitor**. Monitors the services run-time and distributes updates by e-mail in case of any warnings or errors.

Each has their current state identified on [services.peter.sh](https://services.peter.sh/).
