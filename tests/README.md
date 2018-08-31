tests.peter.sh
=================
This repository contains the code powering [tests.peter.sh](https://tests.peter.sh/).

## Available test cases
The intention of these cases isn't to provide automated test coverage, but rather
to provide utility to manual testing and provide comprehensive examples.

  * [Notification Generator](notification-generator/): 
    Tool for dynamically creating notifications in accordance with the
    Notifications API living standard. Enables convenient testing of different
    permutations of settings.
    
  * [Push Message Generator](push-message-generator/):
    Tool for creating push messages in accordance with the Web Push standards. It
    supports multiple versions of the RFC8030 drafts, both standardized and
    proprietary authentication mechanisms and enables various (deliberate) errors
    to be created before sending the message.
  
  * [Push Encryption Verifier](push-encryption-verifier/):
    Tool for displaying the intermediary values when encrypting a particular
    payload in accordance with RFC8291.

## Making changes
Feel free to add, change or remove things from these tools as you see fit, I'd be
happy to take a look at pull requests. Running a copy of the site locally should
be trivial - only sending a push message to a third party service (e.g. FCM)
requires PHP, beyond that there are no dependencies.
