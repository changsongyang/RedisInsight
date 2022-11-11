import { Joi } from '../../helpers/test';
import { caCertSchema, clientCertSchema } from '../certificate/constants';

export const databaseSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().required(),
  host: Joi.string().required(),
  port: Joi.number().integer().required(),
  db: Joi.number().integer().allow(null),
  connectionType: Joi.string().valid('STANDALONE', 'CLUSTER', 'SENTINEL').required(),
  username: Joi.string().allow(null),
  password: Joi.string().allow(null),
  nameFromProvider: Joi.string().allow(null),
  lastConnection: Joi.string().isoDate().allow(null),
  provider: Joi.string().valid('LOCALHOST', 'UNKNOWN', 'RE_CLOUD', 'RE_CLUSTER'),
  tls: Joi.boolean().allow(null),
  tlsServername: Joi.string().allow(null),
  verifyServerCert: Joi.boolean().allow(null),
  caCert: caCertSchema.strict(true).allow(null),
  clientCert: clientCertSchema.strict(true).allow(null),
  sentinelMaster: Joi.object({
    name: Joi.string().required(),
    username: Joi.string().allow(null),
    password: Joi.string().allow(null),
  }).allow(null),
  nodes: Joi.array().items({
    host: Joi.string().required(),
    port: Joi.number().integer().required(),
  }).allow(null),
  modules: Joi.array().items({
    name: Joi.string().required(),
    version: Joi.number().integer(),
    semanticVersion: Joi.string(),
  }).allow(null),
});
