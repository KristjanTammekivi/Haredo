### 2.9.0 (2022-03-01)

### 2.8.0 (2022-03-01)

##### Chores

* **deps:**
  *  bump url-parse from 1.5.7 to 1.5.10 ([258f5a76](https://github.com/KristjanTammekivi/haredo/commit/258f5a76957760dda5a4670e2748c08d56b7ca57))
  *  bump url-parse from 1.5.3 to 1.5.7 ([f25dc1b2](https://github.com/KristjanTammekivi/haredo/commit/f25dc1b2bdd48b3a8b0027bfea61b49f357b1437))
  *  bump follow-redirects from 1.14.7 to 1.14.8 ([90a62ec5](https://github.com/KristjanTammekivi/haredo/commit/90a62ec560365b27d86d1cd94fa2fa7c4559f808))
  *  bump ajv from 6.10.0 to 6.12.6 ([23407bfc](https://github.com/KristjanTammekivi/haredo/commit/23407bfc56ae94171b06337f81f2877247a01b9c))
  *  bump shelljs from 0.8.4 to 0.8.5 ([5921f465](https://github.com/KristjanTammekivi/haredo/commit/5921f4652607db39e7e6d73c0946db3905ad3563))
* **deps-dev:**
  *  bump typedoc from 0.22.11 to 0.22.12 ([3c78ad35](https://github.com/KristjanTammekivi/haredo/commit/3c78ad3556ae955ec8ae23fb45800d765cf34347))
  *  bump mocha from 9.2.0 to 9.2.1 ([69dfbe87](https://github.com/KristjanTammekivi/haredo/commit/69dfbe87a307fe1cd32bdebd5eb0d02907634fdf))
  *  bump @types/chai-as-promised from 7.1.4 to 7.1.5 ([2da34939](https://github.com/KristjanTammekivi/haredo/commit/2da3493958306223350964ed91e0513ba10ec223))
  *  bump @types/sinon from 10.0.10 to 10.0.11 ([598213a6](https://github.com/KristjanTammekivi/haredo/commit/598213a63c18fc152c02465355aeb5045335e83e))
  *  bump rabbitmq-admin from 1.0.2 to 1.1.0 ([df5cebfc](https://github.com/KristjanTammekivi/haredo/commit/df5cebfc9f7659c2283900e25d199b0a03438e62))
  *  bump @types/sinon from 10.0.9 to 10.0.10 ([94d5cb82](https://github.com/KristjanTammekivi/haredo/commit/94d5cb82175dd6c9f631a9001acbadfe5fb774f0))
  *  bump dotenv from 15.0.0 to 16.0.0 ([df4dfe08](https://github.com/KristjanTammekivi/haredo/commit/df4dfe08dbb44d1a35f015a8566cca29ef60fefc))
  *  bump sinon from 13.0.0 to 13.0.1 ([eaba486d](https://github.com/KristjanTammekivi/haredo/commit/eaba486d1b3b73f32405cf22d8e912f0197dc7f7))
  *  bump sinon from 12.0.1 to 13.0.0 ([34a41c4f](https://github.com/KristjanTammekivi/haredo/commit/34a41c4fba6eebcce88ea1fa1e0012cb8b307cb1))
  *  bump @types/sinon from 10.0.8 to 10.0.9 ([29a89a3c](https://github.com/KristjanTammekivi/haredo/commit/29a89a3c0124860434594ba5ff14cc43c6ee6e53))
  *  bump chai from 4.3.5 to 4.3.6 ([74beedc9](https://github.com/KristjanTammekivi/haredo/commit/74beedc938380cfcf031ac26a6853efc317c7e80))
  *  bump chai from 4.3.4 to 4.3.5 ([53dab0ac](https://github.com/KristjanTammekivi/haredo/commit/53dab0acd7e1a3c25f1da44ce8d1d5f112ec87cf))
  *  bump mocha from 9.1.4 to 9.2.0 ([c1b151c9](https://github.com/KristjanTammekivi/haredo/commit/c1b151c96c204287019b12259bc36ccfdacfce42))
  *  bump @types/sinon from 10.0.6 to 10.0.8 ([c6d72fa6](https://github.com/KristjanTammekivi/haredo/commit/c6d72fa6b56529ffe8f011edbbd4ba893925fd57))
  *  bump @types/mocha from 9.0.0 to 9.1.0 ([1a712d39](https://github.com/KristjanTammekivi/haredo/commit/1a712d398b2954f5f05d0584fe95fef2ea290cd6))
  *  bump mocha from 9.1.3 to 9.1.4 ([61e6d1ea](https://github.com/KristjanTammekivi/haredo/commit/61e6d1ea5575c1134ea63e4298d9f43fd029d36f))

##### Other Changes

*  try/catch inside consumer in case of ChannelBrokenErrors, log them out ([f3bcce0a](https://github.com/KristjanTammekivi/haredo/commit/f3bcce0a861a606954f8ce0ee1d199ecae2d88ac))
*  move makeDeferred into utils ([9f27e969](https://github.com/KristjanTammekivi/haredo/commit/9f27e969d79d78ce9b2842868010bf3d82ff3de2))
*  use localhost for rabbit in actions ([202d66c0](https://github.com/KristjanTammekivi/haredo/commit/202d66c0a2d7c35f338ab8cb01f55a0dab650411))
*  specify rabbit port ([26021e0d](https://github.com/KristjanTammekivi/haredo/commit/26021e0d2ebd34c7f89c0fc731e1ba1f5beae53b))
*  use official rabbit image for tests ([54deab9d](https://github.com/KristjanTammekivi/haredo/commit/54deab9df20d488e068ba533447fe9a67f4eef1e))
*  use netcat for health check ([6bb65ef9](https://github.com/KristjanTammekivi/haredo/commit/6bb65ef926931d3a4316b03f93201ee028db0f5c))
*  adjust the health cmd ([feceb0b5](https://github.com/KristjanTammekivi/haredo/commit/feceb0b565315c3eccb81ad27a5c7b0176f61c28))
*  increase health-timeout for rabbitmq in github actions ([24d418ca](https://github.com/KristjanTammekivi/haredo/commit/24d418ca43a6d48d8eb0a68ebd100d7f30756c8c))
*  remove q flag from rabbit health cmd ([15014fc8](https://github.com/KristjanTammekivi/haredo/commit/15014fc8483cd0115706beab25eb28dd255b61d7))
*  add health check for rabbitmq ([6f45f3ef](https://github.com/KristjanTammekivi/haredo/commit/6f45f3ef5745215015b6b23ad5beb62bc0c4407e))
*  fix ya is not a command in workflow ([25725ae3](https://github.com/KristjanTammekivi/haredo/commit/25725ae3fb37f87b34a5381d719f59340373fdf1))
*  add github workflows ([710d8790](https://github.com/KristjanTammekivi/haredo/commit/710d87909629dc13634ee9fed655d60e6f831a13))
*  use rabbit url from env variables ([aed0e68d](https://github.com/KristjanTammekivi/haredo/commit/aed0e68d542b578df59e6a865887b4fced4dee85))
*  upgrade typescript to version 4 ([8521ea4c](https://github.com/KristjanTammekivi/haredo/commit/8521ea4c076e0735cca1cb38c819605a4e702b8a))
*  bump rabbitmq-admin ([1eeaf287](https://github.com/KristjanTammekivi/haredo/commit/1eeaf2870295637ab08c39b51ced765913f308f7))
*  fix link to quorum queue example ([d2a939db](https://github.com/KristjanTammekivi/haredo/commit/d2a939db78d27642fefe3a09c38fda9257094587))
*  use rabbitma-admin instead of rabbitmq-stats ([880bcc89](https://github.com/KristjanTammekivi/haredo/commit/880bcc895c6f28b62419ce4244c9ad48f4382663))
*  add example for quorum queues ([81260307](https://github.com/KristjanTammekivi/haredo/commit/812603073e5abe63b2cec50c200ef468afce29be))
*  upgrade typedoc to get rid of a vulnerability notification that doesn't affect users ([c987096e](https://github.com/KristjanTammekivi/haredo/commit/c987096ef45c35447fd18d17789276539453e6dc))
*  fix typo, change david-dm badge to libraries.io ([13bbba5f](https://github.com/KristjanTammekivi/haredo/commit/13bbba5f634974a88e2c3fea29ad680d19f7370b))

#### 2.7.4 (2022-01-07)

##### Chores

* **deps-dev:**
  *  bump @types/sinon-chai from 3.2.7 to 3.2.8 ([5170c410](https://github.com/KristjanTammekivi/haredo/commit/5170c41019413a3e17ec4e5cc85e64c6c0b31f3a))
  *  bump @types/sinon-chai from 3.2.6 to 3.2.7 ([61477c8f](https://github.com/KristjanTammekivi/haredo/commit/61477c8fc0492e654a039507f8368e5e6f0e2da6))
  *  bump @types/chai from 4.2.22 to 4.3.0 ([9e8bae94](https://github.com/KristjanTammekivi/haredo/commit/9e8bae94b046b1e5a4d778399bb0280ab75033cb))

##### Other Changes

*  add more documentation to README + direct links to examples ([1937ee83](https://github.com/KristjanTammekivi/haredo/commit/1937ee83331545a0c64dffc6f77d75b345252541))
*  add .concurrency alias for .prefetch ([d4df62d0](https://github.com/KristjanTammekivi/haredo/commit/d4df62d0d32a41dd29d5d7b6fc525b7976ab60cc))
*  upgrade test docker image to Rabbit 3.9 ([8c89ef3f](https://github.com/KristjanTammekivi/haredo/commit/8c89ef3f72cac94483d6201528e8c26c09f665f7))

#### 2.7.3 (2021-12-01)

##### Chores

* **deps-dev:**
  *  bump @types/sinon-chai from 3.2.5 to 3.2.6 ([d3cc4fc5](https://github.com/KristjanTammekivi/haredo/commit/d3cc4fc502b6a2102c09e305c43e9aa632bd1a38))
  *  bump source-map-support from 0.5.20 to 0.5.21 ([f83525c7](https://github.com/KristjanTammekivi/haredo/commit/f83525c7caba1a1d0a42b92812bbe6b39ebe4cc7))
  *  bump sinon from 12.0.0 to 12.0.1 ([0cb7babe](https://github.com/KristjanTammekivi/haredo/commit/0cb7babe7559e068af5a053b8163c43334555a2d))
  *  bump sinon from 11.1.2 to 12.0.0 ([11a1a452](https://github.com/KristjanTammekivi/haredo/commit/11a1a4527742b282456c5201cb0c52d37247d51d))
  *  bump @types/sinon from 10.0.5 to 10.0.6 ([f74c99e9](https://github.com/KristjanTammekivi/haredo/commit/f74c99e9a1791331d56e0bf7775f204a84d8aedd))
  *  bump @types/sinon from 10.0.4 to 10.0.5 ([1ace034b](https://github.com/KristjanTammekivi/haredo/commit/1ace034bf12603ecb89b843f000002562509750c))

##### Documentation Changes

*  typo in README ([46bef336](https://github.com/KristjanTammekivi/haredo/commit/46bef3367dd87a1a9e2c1fceacda8caed14d0f29))

#### 2.7.2 (2021-10-20)

##### Chores

* **deps-dev:**
  *  bump mocha from 9.1.2 to 9.1.3 ([55f1474c](https://github.com/KristjanTammekivi/haredo/commit/55f1474c2833e001b2b9a6fa70846fe890d97a7d))
  *  bump mocha from 9.1.1 to 9.1.2 ([78158fd9](https://github.com/KristjanTammekivi/haredo/commit/78158fd979b2f646c9e1e30bfbe0d01f6aa94928))
  *  bump @types/sinon from 10.0.3 to 10.0.4 ([28258732](https://github.com/KristjanTammekivi/haredo/commit/282587328995d844ec3e956b463931e8ccb1f511))
  *  bump @types/sinon from 10.0.2 to 10.0.3 ([a0a14be8](https://github.com/KristjanTammekivi/haredo/commit/a0a14be841cf19578cc04083eaeee330f1b75fe9))
  *  bump @types/chai from 4.2.21 to 4.2.22 ([436b4e58](https://github.com/KristjanTammekivi/haredo/commit/436b4e583664871d6498765880a8330ab93f25d8))
  *  bump source-map-support from 0.5.19 to 0.5.20 ([a11b8e7a](https://github.com/KristjanTammekivi/haredo/commit/a11b8e7ad19630453587639d21073458ca60d072))
  *  bump mocha from 9.1.0 to 9.1.1 ([cf077f53](https://github.com/KristjanTammekivi/haredo/commit/cf077f53ef9405303fc60074db6fbcb58727116a))
  *  bump @types/amqplib from 0.8.1 to 0.8.2 ([1aa0d7f7](https://github.com/KristjanTammekivi/haredo/commit/1aa0d7f7a1a1b320f0cd4ac9853c094c01e26e24))
  *  bump mocha from 9.0.3 to 9.1.0 ([e6948f34](https://github.com/KristjanTammekivi/haredo/commit/e6948f349a1c76e712d28bd48a5c30582f8b07d7))
  *  bump sinon from 11.1.1 to 11.1.2 ([c8c2ca7a](https://github.com/KristjanTammekivi/haredo/commit/c8c2ca7aec663c6dbe999c5c9a8c27054e6f6dd8))
  *  bump @types/debug from 4.1.6 to 4.1.7 ([ad178fcb](https://github.com/KristjanTammekivi/haredo/commit/ad178fcb4f410f693eea683cd5976c8a26b04385))
  *  bump mocha from 9.0.2 to 9.0.3 ([192f96bd](https://github.com/KristjanTammekivi/haredo/commit/192f96bd9145a03fd47e57196dce2212acdac40a))
  *  bump @types/mocha from 8.2.3 to 9.0.0 ([eda5782e](https://github.com/KristjanTammekivi/haredo/commit/eda5782e3fb80d1d9c9bfa302ffc7c2784e719bc))
  *  bump @types/chai from 4.2.20 to 4.2.21 ([dd4ab511](https://github.com/KristjanTammekivi/haredo/commit/dd4ab511c21ca1535adbfde53cb495571a14fb15))
  *  bump @types/mocha from 8.2.2 to 8.2.3 ([abcbe662](https://github.com/KristjanTammekivi/haredo/commit/abcbe662d8984ba697a9f7f803a4b6fc9dbf5b61))
  *  bump @types/chai from 4.2.19 to 4.2.20 ([5656806f](https://github.com/KristjanTammekivi/haredo/commit/5656806fe8db9cd80ac59b198eaab8c54ec3a241))
  *  bump @types/amqplib from 0.8.0 to 0.8.1 ([307a682f](https://github.com/KristjanTammekivi/haredo/commit/307a682f19baf0b778332aa4a4439252d465ccf6))
  *  bump mocha from 9.0.1 to 9.0.2 ([03acce44](https://github.com/KristjanTammekivi/haredo/commit/03acce44a0bb70379dada983956f9bb8cfe9d93c))
  *  bump @types/debug from 4.1.5 to 4.1.6 ([b6c18066](https://github.com/KristjanTammekivi/haredo/commit/b6c18066e76c91bab09bed9af19cb08f9cfebd60))
  *  bump coveralls from 3.1.0 to 3.1.1 ([c2f8c6c8](https://github.com/KristjanTammekivi/haredo/commit/c2f8c6c8fe7ff3392c1bbdca3dde4f1e256b0495))
  *  bump @types/chai from 4.2.18 to 4.2.19 ([b4ee35fa](https://github.com/KristjanTammekivi/haredo/commit/b4ee35fad09fc35781a9644a15927306fdbcef22))
  *  bump mocha from 9.0.0 to 9.0.1 ([2d154bf9](https://github.com/KristjanTammekivi/haredo/commit/2d154bf92c81301f2efc07bb84eca18fd6105e7a))
  *  bump typedoc from 0.20.36 to 0.20.37 ([7e45e2f4](https://github.com/KristjanTammekivi/haredo/commit/7e45e2f47675dd925a416dc0e83fc4e0331795ad))
  *  bump typescript from 3.9.9 to 3.9.10 ([732fc497](https://github.com/KristjanTammekivi/haredo/commit/732fc497923d6973b727f3fab8a3f8e355f2938a))
  *  bump mocha from 8.4.0 to 9.0.0 ([d3bccd5a](https://github.com/KristjanTammekivi/haredo/commit/d3bccd5a8ac96a56f54ac5bca568fe7dfc16e3c6))
  *  bump @types/amqplib from 0.5.17 to 0.8.0 ([b377ffb7](https://github.com/KristjanTammekivi/haredo/commit/b377ffb71acf5e14b3fb0fbfe10018b17a4e5620))
  *  bump @types/sinon from 10.0.1 to 10.0.2 ([61f33661](https://github.com/KristjanTammekivi/haredo/commit/61f336616cdb0ebea38080841dea37c5cdcf1ef7))
  *  bump sinon from 10.0.0 to 11.1.1 ([cd07b853](https://github.com/KristjanTammekivi/haredo/commit/cd07b8533ba85968a66443917b12a654b3169a86))
  *  bump @types/sinon from 10.0.0 to 10.0.1 ([20792895](https://github.com/KristjanTammekivi/haredo/commit/2079289595be47a5092d94aa6382096e4460a2c6))
  *  bump sinon-chai from 3.6.0 to 3.7.0 ([ea4fc5dd](https://github.com/KristjanTammekivi/haredo/commit/ea4fc5dd622d01402c85458bc6e525738d69bb99))
* **deps:**
  *  bump ansi-regex from 5.0.0 to 5.0.1 ([183ea526](https://github.com/KristjanTammekivi/haredo/commit/183ea526afab2d659b775632ed306d89be867788))
  *  bump url-parse from 1.5.1 to 1.5.3 ([3740b16c](https://github.com/KristjanTammekivi/haredo/commit/3740b16c19deb84b528fcab0907d53d9b84a575f))
  *  bump path-parse from 1.0.6 to 1.0.7 ([41257d79](https://github.com/KristjanTammekivi/haredo/commit/41257d793eb6f76cad1d6a160e22294b29b31301))
  *  bump glob-parent from 5.1.0 to 5.1.2 ([3c785979](https://github.com/KristjanTammekivi/haredo/commit/3c785979c3fbfd6bb69311e5852db88f8abc0ec6))

##### Other Changes

*  sometimes headers is undefined ([9092cbf7](https://github.com/KristjanTammekivi/haredo/commit/9092cbf75e6c77bfae0007e0904982d3eacf5732))
*  upgrade travis node_js version ([1cd8a3bb](https://github.com/KristjanTammekivi/haredo/commit/1cd8a3bb76be648b102e5252315c2ab8fb460719))

#### 2.7.1 (2021-05-20)

##### Other Changes

*  allow reconnectDelay option ([672ca227](https://github.com/KristjanTammekivi/haredo/commit/672ca2270910966591dd79b9a3dda433a0278c4f))

### 2.7.0 (2021-05-19)

##### Other Changes

*  amqplib to 0.8.0 ([df860a8c](https://github.com/KristjanTammekivi/haredo/commit/df860a8cfdaa125feb495affbf95cb30bbae27e6))

#### 2.6.3 (2021-05-18)

##### Chores

* **deps-dev:**
  *  bump @types/chai from 4.2.17 to 4.2.18 ([7d58ba95](https://github.com/KristjanTammekivi/haredo/commit/7d58ba9520d5a699a7bacefb7e6fd2fe3ab74fa3))
  *  bump mocha from 8.3.2 to 8.4.0 ([059f2e99](https://github.com/KristjanTammekivi/haredo/commit/059f2e99c002a087e48f4d5ce3188ff9493377e7))
  *  bump @types/chai-as-promised from 7.1.3 to 7.1.4 ([f3ee235e](https://github.com/KristjanTammekivi/haredo/commit/f3ee235e1e38871356fe70eb68a430f3686360ff))
  *  bump @types/chai from 4.2.16 to 4.2.17 ([2223f293](https://github.com/KristjanTammekivi/haredo/commit/2223f2936161732b48877c716d791c85aa0999a4))
  *  bump typedoc from 0.20.35 to 0.20.36 ([d55664c8](https://github.com/KristjanTammekivi/haredo/commit/d55664c8c4a98b37482fa1e5ea2fd2bc702be282))

##### Other Changes

*  upgrade test rabbitmq to 3.8.16 ([694d83d8](https://github.com/KristjanTammekivi/haredo/commit/694d83d8777d76679dad5a2e764445ec8621c32f))

#### 2.6.2 (2021-04-22)

##### Chores

* **deps-dev:**
  *  bump @types/sinon from 9.0.11 to 10.0.0 ([fb31f79f](https://github.com/KristjanTammekivi/haredo/commit/fb31f79fc2cd59f8a36fcc9b2260d2f09945d6f7))
  *  bump @types/chai from 4.2.15 to 4.2.16 ([3b120e7b](https://github.com/KristjanTammekivi/haredo/commit/3b120e7b855307c6319381e9fad3c16b63dc693d))
  *  bump typedoc from 0.20.34 to 0.20.35 ([0b111a3e](https://github.com/KristjanTammekivi/haredo/commit/0b111a3e4b11b78449f467a2f6a09f9493ea65e5))
  *  bump typedoc from 0.20.33 to 0.20.34 ([e6185585](https://github.com/KristjanTammekivi/haredo/commit/e618558588a9f0f79279ce4d6bac8b99f3efae52))
  *  bump sinon from 9.2.4 to 10.0.0 ([59a1befe](https://github.com/KristjanTammekivi/haredo/commit/59a1befee2d8984f6c1a78c57649567631556818))
  *  bump sinon-chai from 3.5.0 to 3.6.0 ([97d23f83](https://github.com/KristjanTammekivi/haredo/commit/97d23f835f84ca22043866a0ad2b233be3b15f7d))
  *  bump @types/mocha from 8.2.1 to 8.2.2 ([73975861](https://github.com/KristjanTammekivi/haredo/commit/73975861a5fb112a317948cba66b25826f58254e))
  *  bump typedoc from 0.20.32 to 0.20.33 ([ac895d09](https://github.com/KristjanTammekivi/haredo/commit/ac895d090c5016c8f50ab71903a8f63ee1853d60))
  *  bump chai from 4.3.3 to 4.3.4 ([c7f06c9d](https://github.com/KristjanTammekivi/haredo/commit/c7f06c9d50e0221ab83c14283d210ceca7fd462d))
  *  bump typedoc from 0.20.30 to 0.20.32 ([48527586](https://github.com/KristjanTammekivi/haredo/commit/4852758674d8e578fcebe63512110ede0a64d790))
  *  bump mocha from 8.3.1 to 8.3.2 ([302b5ffc](https://github.com/KristjanTammekivi/haredo/commit/302b5ffc34b32ba4facb53973c2fa43119cd3de4))
* **deps:**  [security] bump y18n from 4.0.0 to 4.0.1 ([011ec159](https://github.com/KristjanTammekivi/haredo/commit/011ec159f6ffbb7e8bbc88326567f60605f09492))

##### Other Changes

*  add ability to set reconnect delays ([7703c28e](https://github.com/KristjanTammekivi/haredo/commit/7703c28e6d295d483fde02e74a8259308f545d58))

#### 2.6.1 (2021-03-09)

##### Chores

* **deps:**
  *  bump elliptic from 6.5.3 to 6.5.4 ([498ebd93](https://github.com/KristjanTammekivi/haredo/commit/498ebd938d044a4b9fb261c62c4f18d2344480f0))
  *  bump amqplib from 0.7.0 to 0.7.1 ([403066ed](https://github.com/KristjanTammekivi/haredo/commit/403066eddb0f183f1d05ae0d9f0448aff82afd94))
  *  [security] bump elliptic from 6.5.3 to 6.5.4 ([c7d06d1b](https://github.com/KristjanTammekivi/haredo/commit/c7d06d1b4d8976a799663644dbc55a1a392f7876))
* **deps-dev:**
  *  bump @types/sinon from 9.0.10 to 9.0.11 ([866fc7c1](https://github.com/KristjanTammekivi/haredo/commit/866fc7c1e65cf42fe5a7dc16facbde5d268b7f10))
  *  bump mocha from 8.3.0 to 8.3.1 ([eb9cf0f0](https://github.com/KristjanTammekivi/haredo/commit/eb9cf0f09d116bea6a40ffed3c50c520963098bc))
  *  bump typedoc from 0.20.29 to 0.20.30 ([75ab6311](https://github.com/KristjanTammekivi/haredo/commit/75ab631139ede248bbe7adba1094a5d4360c81de))
  *  bump chai from 4.3.1 to 4.3.3 ([fb8aeaeb](https://github.com/KristjanTammekivi/haredo/commit/fb8aeaeb79d3687b87cb11a305f03e958369cacb))
  *  bump typedoc from 0.20.28 to 0.20.29 ([d505d680](https://github.com/KristjanTammekivi/haredo/commit/d505d6802c53968118475583975bc11d5f57548e))
  *  bump chai from 4.3.0 to 4.3.1 ([ee80a36e](https://github.com/KristjanTammekivi/haredo/commit/ee80a36ebb27fd6b4bb1f5496cddbee7050efcc7))

##### Other Changes

*  update amqplib version in package.json ([272c52bf](https://github.com/KristjanTammekivi/haredo/commit/272c52bfcc26538da031901e32a2c0e1f29f45e5))

### 2.6.0 (2021-02-23)

##### Chores

* **deps-dev:**
  *  bump typedoc from 0.20.27 to 0.20.28 ([01db57f6](https://github.com/KristjanTammekivi/haredo/commit/01db57f615b5dd2a790d6fcfe58c372e6e063f18))
  *  bump typedoc from 0.20.25 to 0.20.27 ([a1e08499](https://github.com/KristjanTammekivi/haredo/commit/a1e084992b6044ee667a6dffb04afcd6824a41b6))
  *  bump @types/mocha from 8.2.0 to 8.2.1 ([4f067330](https://github.com/KristjanTammekivi/haredo/commit/4f067330f361eaaa3ffadad187362add4117bcc0))
  *  bump typedoc from 0.20.24 to 0.20.25 ([19bfd0eb](https://github.com/KristjanTammekivi/haredo/commit/19bfd0eb5ea5397c800cda36565236402f1b719d))
  *  bump mocha from 8.2.1 to 8.3.0 ([9b7fe506](https://github.com/KristjanTammekivi/haredo/commit/9b7fe506fc5a3754089d0eae8776555f00b11bf0))
  *  bump @types/chai from 4.2.14 to 4.2.15 ([ee367848](https://github.com/KristjanTammekivi/haredo/commit/ee367848ba58b076f1be00eb219b54620e3a6269))
  *  bump typescript from 3.9.8 to 3.9.9 ([28556de6](https://github.com/KristjanTammekivi/haredo/commit/28556de6deaac140aca0e0264fc432c4c75049ff))
  *  bump typedoc from 0.20.23 to 0.20.24 ([e041b6b9](https://github.com/KristjanTammekivi/haredo/commit/e041b6b94aaf9709e0315b570bad0eead92a5120))
  *  bump typescript from 3.9.7 to 3.9.8 ([a21ee422](https://github.com/KristjanTammekivi/haredo/commit/a21ee422baa730bba82b0e9f296907f8f2a92e17))
  *  bump typedoc from 0.20.20 to 0.20.23 ([67f43b0b](https://github.com/KristjanTammekivi/haredo/commit/67f43b0bde98c449040710f589be6fb034390805))
  *  bump chai from 4.2.0 to 4.3.0 ([c71b360d](https://github.com/KristjanTammekivi/haredo/commit/c71b360dabcb5af7b038570a2fbc274b26878a90))
  *  bump typedoc from 0.20.19 to 0.20.20 ([30ad29b6](https://github.com/KristjanTammekivi/haredo/commit/30ad29b65b375899bb33975448ed17faf6419a8b))
  *  bump typedoc from 0.20.18 to 0.20.19 ([a74b6936](https://github.com/KristjanTammekivi/haredo/commit/a74b69360cf85391d9ca8e380673c2f0ac51c658))
  *  bump sinon from 9.2.3 to 9.2.4 ([633374f7](https://github.com/KristjanTammekivi/haredo/commit/633374f7de18cc31025e6b4e4d5669ac460a12f4))
  *  bump typedoc from 0.20.16 to 0.20.18 ([627e1b81](https://github.com/KristjanTammekivi/haredo/commit/627e1b8130e4988b25f87aa422c8448cadad6171))
  *  bump typedoc from 0.20.14 to 0.20.16 ([77f6a2ba](https://github.com/KristjanTammekivi/haredo/commit/77f6a2bab295c0a9ce8318d224f853c1ea7064a6))
  *  bump typedoc from 0.20.12 to 0.20.14 ([332d4dfe](https://github.com/KristjanTammekivi/haredo/commit/332d4dfed7fd37f23a8ecdcb399c77158ed975d6))
  *  bump sinon from 9.2.2 to 9.2.3 ([f360fd4f](https://github.com/KristjanTammekivi/haredo/commit/f360fd4f9a83d5e831ad293f04fd5fdb7f7f19ea))
  *  bump typedoc from 0.20.10 to 0.20.12 ([e3443ecf](https://github.com/KristjanTammekivi/haredo/commit/e3443ecfba37c0ece925cd2e2a15d5d85a36b849))
  *  bump typedoc from 0.20.4 to 0.20.10 ([02e0a242](https://github.com/KristjanTammekivi/haredo/commit/02e0a242dbb6e12cdf4cbe175669aeeee8bd04d5))
  *  bump @types/amqplib from 0.5.16 to 0.5.17 ([0f1ba64a](https://github.com/KristjanTammekivi/haredo/commit/0f1ba64afcf60e56d95b18727ec9ee0e79f6e2fb))
  *  bump @types/sinon from 9.0.9 to 9.0.10 ([d81d12bb](https://github.com/KristjanTammekivi/haredo/commit/d81d12bb22827750cc990dcc4e0307f4971fb6b3))
  *  bump typescript-tslint-plugin from 1.0.0 to 1.0.1 ([d6123bf3](https://github.com/KristjanTammekivi/haredo/commit/d6123bf34c8084fa05e45471dab5971891e927c9))
  *  bump sinon from 9.2.1 to 9.2.2 ([0cb68ee3](https://github.com/KristjanTammekivi/haredo/commit/0cb68ee33e7b62a675ff6a6b8d98e08a07040092))
  *  bump @types/mocha from 8.0.4 to 8.2.0 ([d596327d](https://github.com/KristjanTammekivi/haredo/commit/d596327d0781e1414e312bb8d6697558c00fe179))
  *  bump typescript-tslint-plugin from 0.5.5 to 1.0.0 ([8b6342a8](https://github.com/KristjanTammekivi/haredo/commit/8b6342a87a3fcb965c07cda808576aa7a741de7d))
  *  bump ts-node from 9.1.0 to 9.1.1 ([f974352c](https://github.com/KristjanTammekivi/haredo/commit/f974352c524529f9673935b374cb159b8a115834))
  *  bump ts-node from 9.0.0 to 9.1.0 ([e52fb01e](https://github.com/KristjanTammekivi/haredo/commit/e52fb01e07749843b082829726a4ac2822aed112))
  *  bump @types/sinon from 9.0.8 to 9.0.9 ([1f3363db](https://github.com/KristjanTammekivi/haredo/commit/1f3363dbbb49b6296e8ade1c18ae8544eea4645e))
  *  bump sinon from 9.2.0 to 9.2.1 ([2f9d7013](https://github.com/KristjanTammekivi/haredo/commit/2f9d7013ef7e441c3354bc62c16af63a949a2b34))
  *  bump rabbitmq-stats from 1.2.2 to 1.2.3 ([aed18121](https://github.com/KristjanTammekivi/haredo/commit/aed18121ab8988822841cd366e8f9229ad43dbe9))
  *  bump @types/mocha from 8.0.3 to 8.0.4 ([04d7b3b8](https://github.com/KristjanTammekivi/haredo/commit/04d7b3b88e47e1b00679d37ea081a48d5d63a8e7))
  *  bump @types/amqplib from 0.5.14 to 0.5.16 ([b94f0ae8](https://github.com/KristjanTammekivi/haredo/commit/b94f0ae82ebca4e43c4519b24d9d1a3b2f8f5902))
  *  bump mocha from 8.2.0 to 8.2.1 ([00d3e21e](https://github.com/KristjanTammekivi/haredo/commit/00d3e21e073ccd7063e99b6940c5414829440d94))
  *  bump mocha from 8.1.3 to 8.2.0 ([67ea6f4d](https://github.com/KristjanTammekivi/haredo/commit/67ea6f4d270099a130598cb11395a4961f7e7140))
  *  bump @types/chai from 4.2.13 to 4.2.14 ([0b0f892f](https://github.com/KristjanTammekivi/haredo/commit/0b0f892f1f9a0406061965a9f52b16207a852225))
  *  bump @types/amqplib from 0.5.13 to 0.5.14 ([0d5140f7](https://github.com/KristjanTammekivi/haredo/commit/0d5140f7c26e5ac0bbf1b15a8276cdd436b3d1ec))
  *  bump sinon from 9.1.0 to 9.2.0 ([9f1e34f0](https://github.com/KristjanTammekivi/haredo/commit/9f1e34f0aa3b4c4b962b2067130144e5816b2772))
  *  bump @types/chai from 4.2.12 to 4.2.13 ([6f6c4cea](https://github.com/KristjanTammekivi/haredo/commit/6f6c4ceac38a9c5c52f005d389ddabe959baabf3))
  *  bump @types/sinon from 9.0.7 to 9.0.8 ([36029e29](https://github.com/KristjanTammekivi/haredo/commit/36029e290325cb6fab9f80292fca88f968e4ccad))
  *  bump @types/sinon from 9.0.6 to 9.0.7 ([b5ac4954](https://github.com/KristjanTammekivi/haredo/commit/b5ac495412c4a0535e27584c0fc4eeee51a2dab6))
  *  bump sinon from 9.0.3 to 9.1.0 ([dae4d08d](https://github.com/KristjanTammekivi/haredo/commit/dae4d08d627e56e02917b3c0179d0b6b44b9d3b0))
  *  bump @types/sinon-chai from 3.2.4 to 3.2.5 ([191f01ea](https://github.com/KristjanTammekivi/haredo/commit/191f01ea3a50663b50004730b7c303af18415bc5))
  *  bump @types/sinon from 9.0.5 to 9.0.6 ([3d85444c](https://github.com/KristjanTammekivi/haredo/commit/3d85444ce9ead207c78780d101b0f8e9e17f9a33))
  *  bump typedoc from 0.19.1 to 0.19.2 ([a1973930](https://github.com/KristjanTammekivi/haredo/commit/a197393027b679926c24d5c7550940d4a863d488))
  *  bump typedoc from 0.18.0 to 0.19.1 ([85249a0e](https://github.com/KristjanTammekivi/haredo/commit/85249a0e9698e7214f0a02905d0b35ece1611843))
  *  bump mocha from 8.1.1 to 8.1.3 ([3fab3916](https://github.com/KristjanTammekivi/haredo/commit/3fab39160b13ada98b2553324a0844ed7ff187ce))
  *  bump @types/sinon from 9.0.4 to 9.0.5 ([0d797e4b](https://github.com/KristjanTammekivi/haredo/commit/0d797e4ba1e153b27fff3c15e6d24f665b5f67c3))
  *  bump ts-node from 8.10.2 to 9.0.0 ([c08f8f9a](https://github.com/KristjanTammekivi/haredo/commit/c08f8f9adab489307fb101bc9af3bb632bf8a59b))
  *  bump @types/mocha from 8.0.2 to 8.0.3 ([fa1b6390](https://github.com/KristjanTammekivi/haredo/commit/fa1b6390e51ff9fb955fafb7ba69a447e7aab04c))
  *  bump sinon from 9.0.2 to 9.0.3 ([20e53d80](https://github.com/KristjanTammekivi/haredo/commit/20e53d80752d9d6cfcefdb69ddd93f7cb9887ed4))
  *  bump @types/mocha from 8.0.1 to 8.0.2 ([72a25e00](https://github.com/KristjanTammekivi/haredo/commit/72a25e00482c79cb4e7fa590bb35ab1ed572fa88))
  *  bump typedoc from 0.17.8 to 0.18.0 ([d3859097](https://github.com/KristjanTammekivi/haredo/commit/d3859097f44f0b578a9da9ab67cd91ded8cb9da2))
  *  bump mocha from 8.1.0 to 8.1.1 ([3fa6acc1](https://github.com/KristjanTammekivi/haredo/commit/3fa6acc1d28ea458f64d773182fcb8fc0576439d))
  *  bump @types/mocha from 8.0.0 to 8.0.1 ([7d6f5670](https://github.com/KristjanTammekivi/haredo/commit/7d6f567007b9ea5ed8613448a0c482e2d5b74f43))
  *  bump mocha from 8.0.1 to 8.1.0 ([d7563f17](https://github.com/KristjanTammekivi/haredo/commit/d7563f17ffcb984baa0e3b54e3eb84cda31f41b3))
  *  bump @types/chai from 4.2.11 to 4.2.12 ([c77015c8](https://github.com/KristjanTammekivi/haredo/commit/c77015c8cd08bf3e30b3bfabafa7645f4cb8406a))
  *  bump typescript from 3.9.6 to 3.9.7 ([baaeab80](https://github.com/KristjanTammekivi/haredo/commit/baaeab8015445a9dcc3766b4c2784b908d1a7fbf))
* **deps:**
  *  bump amqplib from 0.6.0 to 0.7.0 ([a0a6aa1d](https://github.com/KristjanTammekivi/haredo/commit/a0a6aa1d7c780ca3419be0ecc333448f50333e80))
  *  [security] bump highlight.js from 10.2.0 to 10.4.1 ([cd3d4510](https://github.com/KristjanTammekivi/haredo/commit/cd3d4510983425ee473c4f536828c2f91d8b4f0d))
  *  [security] bump elliptic from 6.4.1 to 6.5.3 ([d14e3dbe](https://github.com/KristjanTammekivi/haredo/commit/d14e3dbefceb5006b5608fc9fe9c6d4c55a220b6))

##### New Features

*  add a log for connection success ([8e5842e6](https://github.com/KristjanTammekivi/haredo/commit/8e5842e6db3c67a7a172a4ee0620903b2a0d374b))
*  add a method deliveryLimit on queues ([fdaa70cc](https://github.com/KristjanTammekivi/haredo/commit/fdaa70cc604a19715905cd2f342105fee3e98177))

##### Other Changes

*  bump typedoc to 0.20.4 ([dde49d22](https://github.com/KristjanTammekivi/haredo/commit/dde49d22d3f38ac14ef79e5969c56c37b2205e49))

### 2.5.0 (2020-07-16)

##### Chores

*  upgrade typescript to 3.9.6 ([267a0a33](https://github.com/KristjanTammekivi/haredo/commit/267a0a33f35f160023d07487b8f2fedfdf36178c))
*  fix test rabbitmq dockerfile build ([a3d0f931](https://github.com/KristjanTammekivi/haredo/commit/a3d0f931988a5b6da448a8265f17d5bafc6c7184))
* **deps:**  bump amqplib from 0.5.6 to 0.6.0 ([6026ade6](https://github.com/KristjanTammekivi/haredo/commit/6026ade6c54482deab80ca4dd82f96d13313658e))
* **deps-dev:**
  *  bump @types/mocha from 7.0.2 to 8.0.0 ([f0ff9b62](https://github.com/KristjanTammekivi/haredo/commit/f0ff9b6270aeee9732ed4757a4eea4ba0fd8ebfe))
  *  bump @types/chai-as-promised from 7.1.2 to 7.1.3 ([07f4932c](https://github.com/KristjanTammekivi/haredo/commit/07f4932c13ddc96ef27f219774e9fbe94a28f5f2))
  *  bump typescript from 3.9.5 to 3.9.6 ([d5ab2f28](https://github.com/KristjanTammekivi/haredo/commit/d5ab2f289c2fab9b72e65478bb141de4a91dbc32))
  *  bump typedoc from 0.17.7 to 0.17.8 ([cddea081](https://github.com/KristjanTammekivi/haredo/commit/cddea081235589bbcc5ae7963cf9a0c71578d74d))
  *  bump rewiremock from 3.14.2 to 3.14.3 ([e0894765](https://github.com/KristjanTammekivi/haredo/commit/e08947654b0441c0b1bc0c71a589047d209f2102))
  *  bump typescript from 3.9.3 to 3.9.5 ([ef9a442f](https://github.com/KristjanTammekivi/haredo/commit/ef9a442f95fc8f817f93fdcfbfaea892311fd182))
  *  bump mocha from 7.2.0 to 8.0.1 ([fe96a46f](https://github.com/KristjanTammekivi/haredo/commit/fe96a46f22a854445a23c39d793ea4d2346a106a))
  *  bump nyc from 15.0.1 to 15.1.0 ([9c3b6370](https://github.com/KristjanTammekivi/haredo/commit/9c3b637085115bc7bd4bd0a42296c0e0b25c3a70))

##### New Features

*  check connection opts to make sure there are no extra opts ([d33bbb53](https://github.com/KristjanTammekivi/haredo/commit/d33bbb53e46a4130edaabd0d91f2dee42aa3f40a))

### 2.4.0 (2020-05-29)

##### Chores

* **deps-dev:**
  *  bump ts-node from 8.10.1 to 8.10.2 ([c4e1f38f](https://github.com/KristjanTammekivi/haredo/commit/c4e1f38fb44b3d709d401a5763b907e3a368c842))
  *  bump mocha from 7.1.2 to 7.2.0 ([01ea30a6](https://github.com/KristjanTammekivi/haredo/commit/01ea30a6f4e3c9693ad8e9b0579bb5b6c894eaf5))
  *  bump @types/sinon from 9.0.3 to 9.0.4 ([2c6d6ba8](https://github.com/KristjanTammekivi/haredo/commit/2c6d6ba87994079692d398a97c5e04c97367c2ce))
  *  bump @types/sinon from 9.0.1 to 9.0.3 ([3c5079c1](https://github.com/KristjanTammekivi/haredo/commit/3c5079c1165f4fd58f363a4b686ccc241ded7b36))
  *  bump typescript from 3.9.2 to 3.9.3 ([dfac9ad8](https://github.com/KristjanTammekivi/haredo/commit/dfac9ad8fa4b2e06b2b9372e684cb37187f98e64))
  *  bump rewiremock from 3.14.1 to 3.14.2 ([fdf0c8f1](https://github.com/KristjanTammekivi/haredo/commit/fdf0c8f13313b636e44e8071d3c900f20df7aed7))
  *  bump @types/sinon from 9.0.0 to 9.0.1 ([876335f6](https://github.com/KristjanTammekivi/haredo/commit/876335f68a8ddb3b618fc14cabef24fd80633824))
  *  bump typedoc from 0.17.6 to 0.17.7 ([fa4acdfe](https://github.com/KristjanTammekivi/haredo/commit/fa4acdfe73c236529ccab0639b63d59937578733))

##### New Features

*  export connection options so users don't have to import them from amqplib ([acfefa7e](https://github.com/KristjanTammekivi/haredo/commit/acfefa7eb4a2ce340714f1159234780ecda46cf9))

##### Bug Fixes

*  wipe queue names that start with amq. ([dc9a6745](https://github.com/KristjanTammekivi/haredo/commit/dc9a6745b324b4dba7b2e13f71dcdd9534ed6ffe))

#### 2.3.1 (2020-05-14)

##### Chores

* **deps:**  bump amqplib from 0.5.5 to 0.5.6 ([aef49da2](https://github.com/KristjanTammekivi/haredo/commit/aef49da235226da60ad4a4aea50ccec4de06cfef))
* **deps-dev:**  bump typescript from 3.8.3 to 3.9.2 ([8096b87c](https://github.com/KristjanTammekivi/haredo/commit/8096b87c5c27960e12493adb8fc99ecb4820c919))

### 2.3.0 (2020-05-12)

##### Chores

* **deps-dev:**
  *  bump rewiremock from 3.14.0 to 3.14.1 ([09dc28fd](https://github.com/KristjanTammekivi/haredo/commit/09dc28fd957f1bd825bde6273a523bda645c50e8))
  *  bump rewiremock from 3.13.9 to 3.14.0 ([a2c28c35](https://github.com/KristjanTammekivi/haredo/commit/a2c28c358be8a7cc829d37d9ef64e19f2d2f81e4))
  *  bump ts-node from 8.9.1 to 8.10.1 ([e05ecddd](https://github.com/KristjanTammekivi/haredo/commit/e05ecddde01f0a41e87029323b141479e4003c71))
  *  bump ts-node from 8.9.0 to 8.9.1 ([bf4e49fe](https://github.com/KristjanTammekivi/haredo/commit/bf4e49fe884b3ee479b2a286bfd3d8944db15a86))
  *  bump typedoc from 0.17.4 to 0.17.6 ([8077268c](https://github.com/KristjanTammekivi/haredo/commit/8077268c339982769e3cd42f5d1c721b4ffab86b))
  *  bump coveralls from 3.0.14 to 3.1.0 ([676fc86b](https://github.com/KristjanTammekivi/haredo/commit/676fc86bfd4591bb3d32135e836600ba5cf87a19))
  *  bump source-map-support from 0.5.18 to 0.5.19 ([fe7a32f3](https://github.com/KristjanTammekivi/haredo/commit/fe7a32f33294f3b90e42300de016f41e113ece4c))
  *  bump mocha from 7.1.1 to 7.1.2 ([7766f96d](https://github.com/KristjanTammekivi/haredo/commit/7766f96ddc80fe8a82dbd128e366889a99775eea))
  *  bump coveralls from 3.0.13 to 3.0.14 ([e49398b8](https://github.com/KristjanTammekivi/haredo/commit/e49398b8c1533638591077bf92ed96fc1013211c))

##### New Features

*  passive queues/exchanges ([60657f63](https://github.com/KristjanTammekivi/haredo/commit/60657f63feaef1e09da73b305e9f38fa110446f4))

#### 2.2.3 (2020-04-23)

##### Chores

* **deps-dev:**
  *  bump source-map-support from 0.5.16 to 0.5.18 ([35b6dee0](https://github.com/KristjanTammekivi/haredo/commit/35b6dee087d6091f08520a32e1315ca52f147bde))
  *  bump coveralls from 3.0.11 to 3.0.13 ([dd5748cf](https://github.com/KristjanTammekivi/haredo/commit/dd5748cf6e38feef9e10624d28cc14ae67d87ca0))
  *  bump ts-node from 8.8.1 to 8.9.0 ([5b72c58f](https://github.com/KristjanTammekivi/haredo/commit/5b72c58f278c3fed7ba3ed5ce3d435db8e122f14))
  *  bump sinon from 9.0.1 to 9.0.2 ([b80987c6](https://github.com/KristjanTammekivi/haredo/commit/b80987c62de749d02c62e988d50dc09a24fbac38))
  *  bump typedoc from 0.17.3 to 0.17.4 ([dc3d88a8](https://github.com/KristjanTammekivi/haredo/commit/dc3d88a8ad4ebfe1e8e85f4e9fe15bfeaa576692))
  *  bump nyc from 15.0.0 to 15.0.1 ([5c24df5b](https://github.com/KristjanTammekivi/haredo/commit/5c24df5b430fa23204db438d59a72af2f41b26be))
  *  bump @types/sinon from 7.5.2 to 9.0.0 ([e9806789](https://github.com/KristjanTammekivi/haredo/commit/e980678903d4e6d14f51cd2548c9345758a9b689))
  *  bump @types/sinon-chai from 3.2.3 to 3.2.4 ([cd7870ad](https://github.com/KristjanTammekivi/haredo/commit/cd7870ad839952621bbef4f9f503ab53b49e7b33))

##### Documentation Changes

*  add an old idea about rpc timeouts ([d55da736](https://github.com/KristjanTammekivi/haredo/commit/d55da736adfaba3b94834174fabdc918c376e42a))
*  correct publishing to queue ([b0c7f92d](https://github.com/KristjanTammekivi/haredo/commit/b0c7f92db774d7dbef8040825869aea2e5713816))

#### 2.2.2 (2020-03-24)

##### Chores

* **deps-dev:**
  *  bump typedoc from 0.17.1 to 0.17.3 ([2cae26e0](https://github.com/KristjanTammekivi/haredo/commit/2cae26e0dc4e25bd0e7e8876fd6e58fa63f1c1ee))
  *  bump ts-node from 8.7.0 to 8.8.1 ([ece68d0f](https://github.com/KristjanTammekivi/haredo/commit/ece68d0fc614638d697ef7afaeff04710cda824f))
  *  bump mocha from 7.1.0 to 7.1.1 ([5ad777db](https://github.com/KristjanTammekivi/haredo/commit/5ad777db6ba0e01a37939150deb167fd2cdf0887))
  *  bump coveralls from 3.0.9 to 3.0.11 ([60dfceae](https://github.com/KristjanTammekivi/haredo/commit/60dfceae8e072de59073329ec7506986e16fa5c5))
  *  bump ts-node from 8.6.2 to 8.7.0 ([d957608d](https://github.com/KristjanTammekivi/haredo/commit/d957608d8c471b0a12b94ca341d9748d2ebf3812))
  *  bump typedoc from 0.17.0 to 0.17.1 ([56e2f0ea](https://github.com/KristjanTammekivi/haredo/commit/56e2f0ea88b226d74bb2dc38dc6f7736988ca32c))
  *  bump @types/chai from 4.2.10 to 4.2.11 ([61d2a1c1](https://github.com/KristjanTammekivi/haredo/commit/61d2a1c11736c8392c69ecd2add76c11b720de54))
  *  bump typedoc from 0.16.11 to 0.17.0 ([c2bbed78](https://github.com/KristjanTammekivi/haredo/commit/c2bbed78e57a9d606ddb31e739a914c199d6f7cd))
  *  bump sinon from 9.0.0 to 9.0.1 ([bb2d9a33](https://github.com/KristjanTammekivi/haredo/commit/bb2d9a33c90b2aa536f9739ee92f5060c901478e))

##### Documentation Changes

*  fix outdated "new Haredo" in README.md ([16aa2dc5](https://github.com/KristjanTammekivi/haredo/commit/16aa2dc52ce117b6aca5c8132cf7ca6f26f57f5b))

##### New Features

*  publish replies via a confirm channel ([1f0901ab](https://github.com/KristjanTammekivi/haredo/commit/1f0901abb39eacc71fcbe02ce9d2d00cccba28d8))

##### Tests

*  increase coverage in consumer ([4c813a64](https://github.com/KristjanTammekivi/haredo/commit/4c813a648b972ff9569476c04dac3490b4a18f56))

#### 2.2.1 (2020-03-08)

##### Bug Fixes

*  E2E bindings ([d61a24a6](https://github.com/KristjanTammekivi/haredo/commit/d61a24a6b5e5d0fc3a4de74b883189d9cdcfeacb))

### 2.2.0 (2020-03-07)

##### Chores

*  bump testing rabbitmq version to 3.8.2 ([19824a32](https://github.com/KristjanTammekivi/haredo/commit/19824a32c5db15f0acfa636379880c5749215c50))

##### New Features

*  quorum queue support ([1417a7f2](https://github.com/KristjanTammekivi/haredo/commit/1417a7f2436b7b38315a891cdf076cd1b3cb9cbe))
*  priority queues ([b88de879](https://github.com/KristjanTammekivi/haredo/commit/b88de8795fd92f990ce3b0d3303fcb6fa853805a))

#### 2.1.2 (2020-03-07)

##### Chores

* **deps-dev:**
  *  bump @types/mocha from 7.0.1 to 7.0.2 ([55789659](https://github.com/KristjanTammekivi/haredo/commit/557896598fb6792e3fbf5b72440d3416f22512da))
  *  bump @types/chai from 4.2.9 to 4.2.10 ([aeeb1026](https://github.com/KristjanTammekivi/haredo/commit/aeeb1026df2f5042b3290515f7c2906bfd30225a))
  *  bump typescript from 3.8.2 to 3.8.3 ([8e7a8147](https://github.com/KristjanTammekivi/haredo/commit/8e7a8147e9a688b9c7ff02aee5c7c50f7c2cdfc3))
  *  bump typedoc from 0.16.10 to 0.16.11 ([3d29b48f](https://github.com/KristjanTammekivi/haredo/commit/3d29b48f97a0701eaf9976bb92b3dd251718886c))
  *  bump nyc from 13.3.0 to 15.0.0 ([c9c531ea](https://github.com/KristjanTammekivi/haredo/commit/c9c531ea24a3aefe34333f2a3c9b60b5b74288b8))
  *  bump mocha from 7.0.1 to 7.1.0 ([c8ca610f](https://github.com/KristjanTammekivi/haredo/commit/c8ca610fae143eab95742f6f5a8fe884eda22b22))
  *  bump @types/sinon from 7.5.1 to 7.5.2 ([2bffce6e](https://github.com/KristjanTammekivi/haredo/commit/2bffce6e3400215597bbd538d3bec869655d23b7))
  *  bump @types/chai-as-promised from 7.1.0 to 7.1.2 ([9d393a06](https://github.com/KristjanTammekivi/haredo/commit/9d393a0644d473679db36330116959e5d847392b))
  *  bump sinon from 7.3.2 to 9.0.0 ([861f1fd7](https://github.com/KristjanTammekivi/haredo/commit/861f1fd7ed378962de94b785b85564848f14a684))
  *  bump typedoc from 0.16.9 to 0.16.10 ([4ae53c9c](https://github.com/KristjanTammekivi/haredo/commit/4ae53c9c813d715129f66de0043ba656bae15c6c))
  *  bump sinon-chai from 3.3.0 to 3.5.0 ([78916498](https://github.com/KristjanTammekivi/haredo/commit/789164989588af89bf70291ae5aa0228eca39728))
  *  bump tslint from 5.17.0 to 5.20.1 ([e4557c24](https://github.com/KristjanTammekivi/haredo/commit/e4557c24539f97d268b294969a2a825504e01044))
  *  bump typescript-tslint-plugin from 0.4.0 to 0.5.5 ([dcb3edb8](https://github.com/KristjanTammekivi/haredo/commit/dcb3edb8cf8026638481aab0d7ee1240d08cadc2))
  *  bump @types/debug from 0.0.30 to 4.1.5 ([09f3a851](https://github.com/KristjanTammekivi/haredo/commit/09f3a8512b8002be752e010c971278ebfc36cfc7))
  *  bump ts-node from 8.3.0 to 8.6.2 ([3c5cf15c](https://github.com/KristjanTammekivi/haredo/commit/3c5cf15c0a97cb5f58576a81d9bbc4140db45074))
  *  bump @types/sinon-chai from 3.2.2 to 3.2.3 ([6a3b5ae2](https://github.com/KristjanTammekivi/haredo/commit/6a3b5ae2aa6fa3020dbde1e7b80379ce44eb90c0))
  *  bump typescript from 3.7.4 to 3.8.2 ([fe2b9737](https://github.com/KristjanTammekivi/haredo/commit/fe2b9737ade7795bd46e75a5c2c42f26e16e28c0))
  *  bump @types/amqplib from 0.5.11 to 0.5.13 ([e0bd0741](https://github.com/KristjanTammekivi/haredo/commit/e0bd0741b5c78efd60d1e56d87331a3fc7f2a28b))
  *  bump @types/mocha from 5.2.7 to 7.0.1 ([697a10db](https://github.com/KristjanTammekivi/haredo/commit/697a10dbbeb7627704306d912236a211fe92dfe4))
  *  bump @types/chai from 4.1.7 to 4.2.9 ([9f7e3575](https://github.com/KristjanTammekivi/haredo/commit/9f7e3575da244fb63da2a00bc0d8d728dc480bf8))
  *  bump tslint-config-airbnb from 5.11.1 to 5.11.2 ([67334253](https://github.com/KristjanTammekivi/haredo/commit/67334253493f2f4081894bc2bc17f4c350fabcec))
  *  bump rimraf from 2.6.3 to 3.0.2 ([73e1e928](https://github.com/KristjanTammekivi/haredo/commit/73e1e928641f18e8a553f8d9797e6b3f8413215c))
  *  bump generate-changelog from 1.7.1 to 1.8.0 ([040b4905](https://github.com/KristjanTammekivi/haredo/commit/040b490520bb4cbc955cb21f519b0c485db93ad6))
  *  bump coveralls from 3.0.3 to 3.0.9 ([62770405](https://github.com/KristjanTammekivi/haredo/commit/62770405b888625fe97553223c9869a1d82ba5a0))
  *  bump rewiremock from 3.13.7 to 3.13.9 ([b4f2148a](https://github.com/KristjanTammekivi/haredo/commit/b4f2148a3a2a917b17681beb6ffda3642bd63b62))
  *  bump mocha from 6.2.0 to 7.0.1 ([40648cf4](https://github.com/KristjanTammekivi/haredo/commit/40648cf45e7debbc0d5c7303d232214c3acbe725))
  *  bump typedoc from 0.15.6 to 0.16.9 ([54722d06](https://github.com/KristjanTammekivi/haredo/commit/54722d06befc4aac246b5ce1195553ab458d61d6))
  *  bump source-map-support from 0.5.12 to 0.5.16 ([ca80952b](https://github.com/KristjanTammekivi/haredo/commit/ca80952b32aea26910902f5baf55a772ee02b95f))
  *  bump @types/sinon from 7.0.12 to 7.5.1 ([d2ea7aa3](https://github.com/KristjanTammekivi/haredo/commit/d2ea7aa362aefcd9be3db3d51be764625298bb94))

#### 2.1.1 (2020-01-26)

##### Other Changes

*  specify msg as string now ([aa1359e3](https://github.com/KristjanTammekivi/haredo/commit/aa1359e39f2389dacd38ab1c59649cc8cb826233))

### 2.1.0 (2020-01-26)

##### Documentation Changes

*  add documentation on haredo.connect and haredo.close ([4df10ab6](https://github.com/KristjanTammekivi/haredo/commit/4df10ab698bb78db855c69d5626d42c8303a4746))

##### New Features

*  minor logging overhaul to give user more information ([149cd8a8](https://github.com/KristjanTammekivi/haredo/commit/149cd8a8cb0eae127bc7fd035e1d52e906eb4fe7))

##### Bug Fixes

*  message not being removed from message manager ([508a4e27](https://github.com/KristjanTammekivi/haredo/commit/508a4e27c95bae90348010950101bfb5b7df3566))

##### Tests

*  add haredo.connect in a test so it's not uncovered ([4bfc01e4](https://github.com/KristjanTammekivi/haredo/commit/4bfc01e4194c6728373d26e7d7c6530f8ffbabc9))
*  add some strategic istanbul-ignores in connection-manager ([accfc37d](https://github.com/KristjanTammekivi/haredo/commit/accfc37d1b5636f7392765322481405130e0a977))
*  increase test coverage for isHaredo... methods ([c04413eb](https://github.com/KristjanTammekivi/haredo/commit/c04413eb2edcd843d53f50bfe466232ad3c618c5))

#### 2.0.2 (2020-01-23)

##### New Features

*  implement noAck, consumer exclusivity/priority ([a526ff51](https://github.com/KristjanTammekivi/haredo/commit/a526ff5128a275f978396bfa1edaa97bede50611))

##### Refactors

*  clean up some unnecessary code ([486bb1c6](https://github.com/KristjanTammekivi/haredo/commit/486bb1c64198a6f68bcc20118010cae82022a082))

##### Tests

*  add final test for ticketMachine ([bf1f1f1f](https://github.com/KristjanTammekivi/haredo/commit/bf1f1f1ff941fdda9d7d292c3f2d9a70d9c1ea9d))
*  increase test coverage in publishing and consuming ([4b180211](https://github.com/KristjanTammekivi/haredo/commit/4b18021108fda52b220b2fb62c4cfb43f423c5a9))
*  increase test coverage for publisher ([504b901e](https://github.com/KristjanTammekivi/haredo/commit/504b901e9ef8304c481a6923b4197972bb8d3bfe))

#### 2.0.1 (2020-01-21)

##### Chores

*  add backoff example ([e744154a](https://github.com/KristjanTammekivi/haredo/commit/e744154a4740eaf2ad59327179db55c4ca3e2d26))

##### Documentation Changes

*  add extra jsdocs ([13960c9a](https://github.com/KristjanTammekivi/haredo/commit/13960c9acc3b40663cb0f048900f44fa16dde9f1))
*  add jsdocs to Consumer.prefetch ([a7c335b6](https://github.com/KristjanTammekivi/haredo/commit/a7c335b6301b3b35d51ad55a173c7b81a965dd05))

##### Bug Fixes

*  recommit missing haredo icon ([edd3b587](https://github.com/KristjanTammekivi/haredo/commit/edd3b587987ebb3844b7332191037ce324507687))

##### Refactors

*  failure backoffs ([32ec4eb3](https://github.com/KristjanTammekivi/haredo/commit/32ec4eb32091a65d11e4e72ac9d749e5e467e793))

#### 1.3.2 (2019-12-30)

##### Chores

* **deps:**  bump handlebars from 4.1.2 to 4.5.3 ([bbeed51c](https://github.com/KristjanTammekivi/haredo/commit/bbeed51c1b66db727f249ffc50e72d2b2ed00af0))
*  bump dependencies ([7e814f8c](https://github.com/KristjanTammekivi/haredo/commit/7e814f8cb8718e20e1217f00092ea34ad2336cd5))

#### 1.3.1 (2019-12-17)

##### Chores

* **deps:**  bump lodash.template from 4.4.0 to 4.5.0 ([4ddae461](https://github.com/KristjanTammekivi/haredo/commit/4ddae46123cb842071733fdeccfa471c224ef11c))

### 1.3.0 (2019-07-20)

##### Chores

*  remove .only from rpc tests ([7fc0f7f7](https://github.com/KristjanTammekivi/haredo/commit/7fc0f7f767766d21432cec539dc6c7c8b485b1a3))

##### Documentation Changes

*  add some documentation/warnings on RPC ([e313e6c1](https://github.com/KristjanTammekivi/haredo/commit/e313e6c13bcd31209596b62e617b81f044cfcb24))
*  add an extra tidbit about manual reply ([489e0677](https://github.com/KristjanTammekivi/haredo/commit/489e06771e2be77ac0d7e880b0a58d46b4bb41ec))
*  add RPC to README ([396a0315](https://github.com/KristjanTammekivi/haredo/commit/396a031539dc5b4cc500f9771e5541d69073d857))

##### New Features

*  add an option for autoReply ([c7123f9f](https://github.com/KristjanTammekivi/haredo/commit/c7123f9f4ebfcfea8073237fc148ae1c2632359f))
*  initial implementation of RPC ([6353d344](https://github.com/KristjanTammekivi/haredo/commit/6353d344e8f96a19320858b4bff29fdbe2de55d7))

##### Bug Fixes

*  fix tests with eventually.rejected ([45d46da2](https://github.com/KristjanTammekivi/haredo/commit/45d46da2f6c1fdfe43f0714f14cea13f129a5359))
*  linting error which isn't an error ([a5c9b1e5](https://github.com/KristjanTammekivi/haredo/commit/a5c9b1e57723809d0bbd01d11edf83da350dde2e))

##### Tests

*  increase rpc code coverage ([5d957d29](https://github.com/KristjanTammekivi/haredo/commit/5d957d2985237216f48c1d67e9b6633e483d6a2c))
*  add tests to cover rpc ([7dd9b628](https://github.com/KristjanTammekivi/haredo/commit/7dd9b628173488b59a71a39718fd6f2f184d9f5d))

#### 1.2.6 (2019-07-07)

##### Bug Fixes

*  lint error ([d7408701](https://github.com/KristjanTammekivi/haredo/commit/d7408701a374f758b872cd7708aca7188dcf8424))
*  emit connected event even when haredo.connect is not called ([289f00a2](https://github.com/KristjanTammekivi/haredo/commit/289f00a28705be6a72051b48363cf2ab6f553f96))

#### 1.2.5 (2019-07-07)

##### Bug Fixes

*  don't assert anonymous queues when there is a binding ([4fcb2b1e](https://github.com/KristjanTammekivi/haredo/commit/4fcb2b1ec177fe897e578df6ba93233ea07ead95))

#### 1.2.4 (2019-07-02)

##### Bug Fixes

*  solve race condition from [#12](https://github.com/KristjanTammekivi/haredo/pull/12) ([48ab2727](https://github.com/KristjanTammekivi/haredo/commit/48ab27273da5a6533c0f6039eab96cdafbc8db7a))

#### 1.2.3 (2019-06-12)

##### Documentation Changes

*  add more jsdocs ([8b9f824c](https://github.com/KristjanTammekivi/haredo/commit/8b9f824ce5f98ba9876903bb497e9cd5844acf16))

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

