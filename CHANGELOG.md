#### 1.2.2 (2019-06-09)

##### Documentation Changes

*  document .confirm() in README.md ([cb570b30](https://github.com/KristjanTammekivi/haredo/commit/cb570b30f6407cec1472b4b773594427fe903b66))
*  add a link to xkcd ([f6b8ecc6](https://github.com/KristjanTammekivi/haredo/commit/f6b8ecc62f4c046b6a39d98ae651aaf7fd7b0e85))

##### New Features

*  add possibility to pass an arr  of patterns ([c6dfe2ba](https://github.com/KristjanTammekivi/haredo/commit/c6dfe2bac1175bca6a58c1f5d66ff3dbf6f6b395))

#### 1.2.2 (2019-06-09)

##### Documentation Changes

*  add a link to xkcd ([f6b8ecc6](https://github.com/KristjanTammekivi/haredo/commit/f6b8ecc62f4c046b6a39d98ae651aaf7fd7b0e85))

#### 1.2.1 (2019-06-09)

##### Documentation Changes

*  add extra explanation about automatic setup ([5099b87f](https://github.com/KristjanTammekivi/haredo/commit/5099b87f444026030285b516aea074d37bc1529e))

##### New Features

*  expose Middleware interface from index ([5b67178e](https://github.com/KristjanTammekivi/haredo/commit/5b67178e0522a6333f4842d08f60afd50876624e))

### 1.2.0 (2019-06-08)

##### Documentation Changes

*  add a note to README.md on manual acks/nacks ([9f386fa9](https://github.com/KristjanTammekivi/haredo/commit/9f386fa971fd0b53977116855f9f460dd9c408db))
*  add dead letter example ([57614463](https://github.com/KristjanTammekivi/haredo/commit/57614463d26b6b91e3cbecff17a74a75ddba1578))
*  link to unexpected behaviour in readme ([a1fe91a8](https://github.com/KristjanTammekivi/haredo/commit/a1fe91a809d838fbb0742f862540cfde8c130313))

##### New Features

*  middleware ([948d7c11](https://github.com/KristjanTammekivi/haredo/commit/948d7c11a19d396b197fda84f483f2abadab774f))

##### Bug Fixes

*  linting error for deadletter example ([d1fd0f7c](https://github.com/KristjanTammekivi/haredo/commit/d1fd0f7cbeeaf9fb6cdbbc86e37f9aaa3392f032))

#### 1.1.1 (2019-06-05)

##### Documentation Changes

*  write jsdocs for haredo-chain methods ([6a717a19](https://github.com/KristjanTammekivi/haredo/commit/6a717a1914698e9cbcc6f079122abf34ef87a376))

##### New Features

*  nack w/ no requeue  messages when json parsing on message fails ([1e24a036](https://github.com/KristjanTammekivi/haredo/commit/1e24a036687029ebc8c9a2108f03232beeb2af0d))

##### Refactors

*  remove channel borking on messages ([5151bfa7](https://github.com/KristjanTammekivi/haredo/commit/5151bfa70f32c11afdf21d6fb97c5d69574516bd))

### 1.1.0 (2019-06-04)

##### Documentation Changes

*  add some method documentation ([39de148f](https://github.com/KristjanTammekivi/haredo/commit/39de148f6d722952c09a1b5ac961c2420a81547b))
*  switch out the badges ([373db968](https://github.com/KristjanTammekivi/haredo/commit/373db968192117f097a847c3becda73403bfaf56))

##### New Features

*  modify the behaviour of anonymous queues ([1e9bc6ba](https://github.com/KristjanTammekivi/haredo/commit/1e9bc6ba52595d2cc71d4643259a368203be9986))

##### Tests

*  increase coverage to 100% ([97cb14b4](https://github.com/KristjanTammekivi/haredo/commit/97cb14b4e5d79e5ac180c5a3917b4343a7096277))
*  reenable other tests ([f1e0d659](https://github.com/KristjanTammekivi/haredo/commit/f1e0d659f6382fcfc620cb697420fead733f80f1))
*  increase test coverage in queue and message-manager ([618459c0](https://github.com/KristjanTammekivi/haredo/commit/618459c07ae48abad1a560c9d55bbeaa8a08eac6))

## 1.0.0 (2019-06-02)

##### New Features

*  add graceful shutdown example ([fb0e2839](https://github.com/KristjanTammekivi/haredo/commit/fb0e2839eab08f617199e6044e3170ac4ecf2e9c))
*  make queue shothand take in options ([541a6046](https://github.com/KristjanTammekivi/haredo/commit/541a6046a99c17d2e72c13013a9b65299e6ce6e5))

##### Refactors

*  remove unused consumer defaults ([d9848f74](https://github.com/KristjanTammekivi/haredo/commit/d9848f74c6e709626d5a6e0c348e4d8f05901e92))

#### 0.4.2 (2019-06-02)

##### Chores

*  fix existing examples ([1b59b9d1](https://github.com/KristjanTammekivi/haredo/commit/1b59b9d19c16c314a6d1286f598a5205c18d1439))

##### New Features

*  don't assert queues starting with 'amq.' ([95b9992a](https://github.com/KristjanTammekivi/haredo/commit/95b9992a98944933c852e5dcd2a7c3b45ccccc12))
*  add skipSetup option to chains ([81064de0](https://github.com/KristjanTammekivi/haredo/commit/81064de04588c247f2d63687c7d89cb15f887517))
*  add maxLength setter for queue ([72cff258](https://github.com/KristjanTammekivi/haredo/commit/72cff2580d1f5a3045c79927867529cdde1a6850))

##### Bug Fixes

*  actually skip setup ([8a743cad](https://github.com/KristjanTammekivi/haredo/commit/8a743cadcab0189d5b4b98804dfbc67f5f1325a6))

#### 0.4.1 (2019-06-01)

##### New Features

*  add Haredo logo ([c763165d](https://github.com/KristjanTammekivi/haredo/commit/c763165db0edbe66232c14f3128ad87c84667dc1))

##### Bug Fixes

*  build errors ([5a036647](https://github.com/KristjanTammekivi/haredo/commit/5a036647f4c5b9a3fcbee2093d0cc472d7890683))

##### Tests

*  higher coverage for haredo and fail-handler ([fa38b0ad](https://github.com/KristjanTammekivi/haredo/commit/fa38b0adad4ed0993d583b0ea7f107fc96e103a1))
*  cover consumer with tests, fix error in cancellation logic ([8573390e](https://github.com/KristjanTammekivi/haredo/commit/8573390ead6ad48e920fc0aad9dadfd8ecde8e2e))
*  add logger tests ([cc1fbc83](https://github.com/KristjanTammekivi/haredo/commit/cc1fbc83347ae6b950e37265bf0ae5e98530f77e))

### 0.4.0 (2019-06-01)

##### Chores

*  add tslint ([2555a361](https://github.com/KristjanTammekivi/haredo/commit/2555a3613d1e6ad91632ddfc87d0deff768ffb10))

##### New Features

*  take .json into account when publishing ([2be5966c](https://github.com/KristjanTammekivi/haredo/commit/2be5966ce02907296b53efeae2400bbea277ed1d))
*  remove suppressErroor, increase test coverage ([e55f8ec2](https://github.com/KristjanTammekivi/haredo/commit/e55f8ec22eaf8afbee301ddae66743d119ec6952))
*  improved logging ([f4a8b831](https://github.com/KristjanTammekivi/haredo/commit/f4a8b83121dbd364231067e6d1e7f671a20c1172))

##### Bug Fixes

*  linter fixes ([ffb15f60](https://github.com/KristjanTammekivi/haredo/commit/ffb15f603c355ccaa192cf9af284ffbc3892fec8))

##### Tests

*  write unit tests for connection manager ([90139ad7](https://github.com/KristjanTammekivi/haredo/commit/90139ad7fba478d4a2bb072cff16b831e973fea6))
*  add swallowError test ([5d273956](https://github.com/KristjanTammekivi/haredo/commit/5d273956af28c8912876f8ef923257c0108d6423))

#### 0.3.2 (2019-05-31)

##### Chores

*  add homepage ([02fe6135](https://github.com/KristjanTammekivi/haredo/commit/02fe6135b3a38b9d140dcfb162bfb5ed85366255))
*  bump version for debug ([ff7a51ee](https://github.com/KristjanTammekivi/haredo/commit/ff7a51ee2e32d4826b1aeb952a591cc8454ab833))

##### Documentation Changes

*  add typedoc generation ([3ddbd8d3](https://github.com/KristjanTammekivi/haredo/commit/3ddbd8d3181c4be919c591f612148bf154a01ba5))
*  add jsdoc for consumer and haredo methods ([f737529e](https://github.com/KristjanTammekivi/haredo/commit/f737529e738612618215a5749a13ba3f17ae2649))

##### Tests

*  raise coverage for HaredoChain ([eae3587b](https://github.com/KristjanTammekivi/haredo/commit/eae3587b25364f902ea385502998c24f3d2a707e))
*  add test for reconnection ([dc76fc3f](https://github.com/KristjanTammekivi/haredo/commit/dc76fc3f5e65ee6f7c387adbe937ce7b81a99ac0))

#### 0.3.1 (2019-05-30)

##### Documentation Changes

*  reflect recent api changes in README.md ([0a6bb4e8](https://github.com/KristjanTammekivi/haredo/commit/0a6bb4e82ca269c1822a3592345bc18fd5054f27))

##### Tests

*  increase test coverage in queue ([2d96b6a9](https://github.com/KristjanTammekivi/haredo/commit/2d96b6a99f309e5924143b47534e7636663fb2c3))
*  increase test coverage in exchange ([05293695](https://github.com/KristjanTammekivi/haredo/commit/05293695f6c4987d75dfd1e796c47419887bbd1f))

### 0.3.0 (2019-05-30)

##### Chores

*  add changelog generation ([d33d6bcf](https://github.com/KristjanTammekivi/haredo/commit/d33d6bcfe8b999600b279c1391505118a3e62bc1))

##### New Features

*  set better defaults for chains ([328e084f](https://github.com/KristjanTammekivi/haredo/commit/328e084f86a33a51fc0febd5ed15b421c8fca9da))

##### Refactors

*  simpler fail handler ([4c1f4fd1](https://github.com/KristjanTammekivi/haredo/commit/4c1f4fd1647281a1bfe525a03e3bbedec5b36bdb))

##### Tests

*  fix tests left broken from defaults change ([7e9d1fd5](https://github.com/KristjanTammekivi/haredo/commit/7e9d1fd549dabdd379a30f40f4248a2fbf3187bd))
*  make all tests run again ([3cfeb875](https://github.com/KristjanTammekivi/haredo/commit/3cfeb8758b4eb04eb12eabf5f09c789d524d4abc))

