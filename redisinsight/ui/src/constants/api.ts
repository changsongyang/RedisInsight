enum ApiEndpoints {
  DATABASES = 'databases',
  DATABASES_IMPORT = 'databases/import',
  DATABASES_TEST_CONNECTION = 'databases/test',
  DATABASES_EXPORT = 'databases/export',

  BULK_ACTIONS_IMPORT = 'bulk-actions/import',
  BULK_ACTIONS_IMPORT_TUTORIAL_DATA = 'bulk-actions/import/tutorial-data',

  CA_CERTIFICATES = 'certificates/ca',
  CLIENT_CERTIFICATES = 'certificates/client',

  REDIS_CLUSTER_GET_DATABASES = 'redis-enterprise/cluster/get-databases',
  REDIS_CLUSTER_DATABASES = 'redis-enterprise/cluster/databases',

  REDIS_CLOUD_ACCOUNT = 'cloud/autodiscovery/account',
  REDIS_CLOUD_SUBSCRIPTIONS = 'cloud/autodiscovery/subscriptions',
  REDIS_CLOUD_GET_DATABASES = 'cloud/autodiscovery/get-databases',
  REDIS_CLOUD_DATABASES = 'cloud/autodiscovery/databases',

  SENTINEL_GET_DATABASES = 'redis-sentinel/get-databases',
  SENTINEL_DATABASES = 'redis-sentinel/databases',

  KEYS = 'keys',
  KEYS_METADATA = 'keys/get-metadata',
  KEY_INFO = 'keys/get-info',
  KEY_NAME = 'keys/name',
  KEY_TTL = 'keys/ttl',

  ZSET = 'zSet',
  ZSET_MEMBERS = 'zSet/members',
  ZSET_MEMBERS_SEARCH = 'zSet/search',
  ZSET_GET_MEMBERS = 'zSet/get-members',

  SET = 'set',
  SET_GET_MEMBERS = 'set/get-members',
  SET_MEMBERS = 'set/members',

  STRING = 'string',
  STRING_VALUE = 'string/get-value',

  HASH = 'hash',
  HASH_FIELDS = 'hash/fields',
  HASH_GET_FIELDS = 'hash/get-fields',

  LIST = 'list',
  LIST_GET_ELEMENTS = 'list/get-elements',
  LIST_DELETE_ELEMENTS = 'list/elements',

  REJSON = 'rejson-rl',
  REJSON_GET = 'rejson-rl/get',
  REJSON_SET = 'rejson-rl/set',
  REJSON_ARRAPPEND = 'rejson-rl/arrappend',

  STREAMS = 'streams',
  STREAMS_ENTRIES = 'streams/entries',
  STREAMS_ENTRIES_GET = 'streams/entries/get',
  STREAMS_CONSUMER_GROUPS = 'streams/consumer-groups',
  STREAMS_CONSUMERS = 'streams/consumer-groups/consumers',
  STREAMS_CONSUMER_GROUPS_GET = 'streams/consumer-groups/get',
  STREAMS_CONSUMERS_GET = 'streams/consumer-groups/consumers/get',
  STREAMS_CONSUMERS_MESSAGES_GET = 'streams/consumer-groups/consumers/pending-messages/get',
  STREAM_CLAIM_PENDING_MESSAGES = 'streams/consumer-groups/consumers/pending-messages/claim',
  STREAM_ACK_PENDING_ENTRIES = 'streams/consumer-groups/consumers/pending-messages/ack',

  INFO = 'info',
  CLI_BLOCKING_COMMANDS = 'info/cli-blocking-commands',
  CLI_UNSUPPORTED_COMMANDS = 'info/cli-unsupported-commands',

  CLI = 'cli',
  SEND_COMMAND = 'send-command',
  SEND_CLUSTER_COMMAND = 'send-cluster-command',

  COMMAND_EXECUTIONS = 'command-executions',

  SETTINGS = 'settings',
  SETTINGS_AGREEMENTS_SPEC = 'settings/agreements/spec',

  WORKBENCH_COMMAND_EXECUTIONS = 'workbench/command-executions',

  PROFILER = 'profiler',
  PROFILER_LOGS = 'profiler/logs',

  REDIS_COMMANDS = 'commands',
  GUIDES = 'static/guides/manifest.json',
  TUTORIALS = 'static/tutorials/manifest.json',
  CUSTOM_TUTORIALS = 'custom-tutorials',
  CUSTOM_TUTORIALS_MANIFEST = 'custom-tutorials/manifest',
  PLUGINS = 'plugins',
  STATE = 'state',
  CONTENT_CREATE_DATABASE = 'static/content/create-redis.json',
  CONTENT_RECOMMENDATIONS = 'static/content/recommendations.json',
  CONTENT_GUIDE_LINKS = 'static/content/guide-links.json',
  GUIDES_PATH = 'static/guides',
  TUTORIALS_PATH = 'static/tutorials',
  CUSTOM_TUTORIALS_PATH = 'static/custom-tutorials',

  SLOW_LOGS = 'slow-logs',
  SLOW_LOGS_CONFIG = 'slow-logs/config',

  PUB_SUB = 'pub-sub',
  PUB_SUB_MESSAGES = 'pub-sub/messages',
  CLUSTER_DETAILS = 'cluster-details',
  DATABASE_ANALYSIS = 'analysis',
  RECOMMENDATIONS = 'recommendations',
  RECOMMENDATIONS_READ = 'recommendations/read',

  TRIGGERED_FUNCTIONS_LIBRARIES = 'triggered-functions/libraries',
  TRIGGERED_FUNCTIONS_FUNCTIONS = 'triggered-functions/functions',
  TRIGGERED_FUNCTIONS_GET_LIBRARY = 'triggered-functions/get-library',
  TRIGGERED_FUNCTIONS_REPLACE_LIBRARY = 'triggered-functions/library/replace',
  TRIGGERED_FUNCTIONS_LIBRARY = 'triggered-functions/library',

  NOTIFICATIONS = 'notifications',
  NOTIFICATIONS_READ = 'notifications/read',

  REDISEARCH = 'redisearch',
  REDISEARCH_SEARCH = 'redisearch/search',
  HISTORY = 'history',

  FEATURES = 'features',
}

export enum CustomHeaders {
  DbIndex = 'ri-db-index',
  WindowId = 'x-window-id',
}

export const DEFAULT_SEARCH_MATCH = '*'

const SCAN_COUNT_DEFAULT_ENV = process.env.SCAN_COUNT_DEFAULT || '500'
const PIPELINE_COUNT_DEFAULT_ENV = process.env.PIPELINE_COUNT_DEFAULT || '5'
const SCAN_TREE_COUNT_DEFAULT_ENV = process.env.SCAN_TREE_COUNT_DEFAULT || '10000'

export const SCAN_COUNT_DEFAULT = parseInt(SCAN_COUNT_DEFAULT_ENV, 10)
export const PIPELINE_COUNT_DEFAULT = parseInt(PIPELINE_COUNT_DEFAULT_ENV, 10)
export const SCAN_TREE_COUNT_DEFAULT = parseInt(SCAN_TREE_COUNT_DEFAULT_ENV, 10)
export const SCAN_STREAM_START_DEFAULT = '-'
export const SCAN_STREAM_END_DEFAULT = '+'

export default ApiEndpoints
