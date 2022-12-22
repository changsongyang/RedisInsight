/* eslint-disable no-nested-ternary */
import { ConnectionString } from 'connection-string'
import { pick } from 'lodash'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router'

import {
  createInstanceStandaloneAction,
  instancesSelector,
  updateInstanceAction,
} from 'uiSrc/slices/instances/instances'
import {
  fetchMastersSentinelAction,
  sentinelSelector,
} from 'uiSrc/slices/instances/sentinel'
import { Nullable, removeEmpty } from 'uiSrc/utils'
import { localStorageService } from 'uiSrc/services'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { caCertsSelector, fetchCaCerts } from 'uiSrc/slices/instances/caCerts'
import { ConnectionType, Instance, InstanceType, } from 'uiSrc/slices/interfaces'
import { BrowserStorageItem, DbType, Pages, REDIS_URI_SCHEMES } from 'uiSrc/constants'
import { clientCertsSelector, fetchClientCerts, } from 'uiSrc/slices/instances/clientCerts'

import InstanceForm, { ADD_NEW, ADD_NEW_CA_CERT, NO_CA_CERT } from './InstanceForm'

export interface Props {
  width: number
  isResizablePanel?: boolean
  instanceType: InstanceType
  editMode: boolean
  editedInstance: Nullable<Instance>
  onDbAdded: () => void
  onClose?: () => void
  onDbEdited?: () => void
  onAliasEdited?: (value: string) => void
}

export enum SubmitBtnText {
  AddDatabase = 'Add Redis Database',
  EditDatabase = 'Apply changes',
  ConnectToSentinel = 'Discover database',
  CloneDatabase = 'Clone Database'
}

export enum LoadingDatabaseText {
  AddDatabase = 'Adding database...',
  EditDatabase = 'Editing database...',
}

export enum TitleDatabaseText {
  AddDatabase = 'Add Redis Database',
  EditDatabase = 'Edit Redis Database',
}

const getInitialValues = (editedInstance: Nullable<Instance>) => ({
  host: editedInstance?.host ?? '',
  port: editedInstance?.port?.toString() ?? '',
  name: editedInstance?.name ?? '',
  username: editedInstance?.username ?? '',
  password: editedInstance?.password ?? '',
  tls: !!editedInstance?.tls ?? false,
})

const InstanceFormWrapper = (props: Props) => {
  const {
    editMode,
    width,
    instanceType,
    isResizablePanel = false,
    onClose,
    onDbAdded,
    onDbEdited,
    onAliasEdited,
    editedInstance,
  } = props
  const [initialValues, setInitialValues] = useState(getInitialValues(editedInstance))
  const [isCloneMode, setIsCloneMode] = useState<boolean>(false)

  const { host, port, name, username, password, tls } = initialValues

  const { loadingChanging: loadingStandalone } = useSelector(instancesSelector)
  const { loading: loadingSentinel } = useSelector(sentinelSelector)
  const { data: caCertificates } = useSelector(caCertsSelector)
  const { data: certificates } = useSelector(clientCertsSelector)

  const tlsClientAuthRequired = !!editedInstance?.clientCert?.id ?? false
  const selectedTlsClientCertId = editedInstance?.clientCert?.id ?? ADD_NEW
  const verifyServerTlsCert = editedInstance?.verifyServerCert ?? false
  const selectedCaCertName = editedInstance?.caCert?.id ?? NO_CA_CERT
  const sentinelMasterUsername = editedInstance?.sentinelMaster?.username ?? ''
  const sentinelMasterPassword = editedInstance?.sentinelMaster?.password ?? ''

  const connectionType = editedInstance?.connectionType ?? DbType.STANDALONE
  const masterName = editedInstance?.sentinelMaster?.name

  const history = useHistory()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchCaCerts())
    dispatch(fetchClientCerts())
  }, [])

  useEffect(() => {
    editedInstance && setInitialValues({
      ...initialValues,
      ...getInitialValues(editedInstance)
    })
    setIsCloneMode(false)
  }, [editedInstance])

  const onMastersSentinelFetched = () => {
    history.push(Pages.sentinelDatabases)
  }

  const handleSubmitDatabase = (payload: any) => {
    if (isCloneMode && connectionType === ConnectionType.Sentinel) {
      dispatch(createInstanceStandaloneAction(payload))
      return
    }

    if (instanceType === InstanceType.Sentinel) {
      sendEventTelemetry({
        event: TelemetryEvent.CONFIG_DATABASES_REDIS_SENTINEL_AUTODISCOVERY_SUBMITTED
      })

      delete payload.name
      delete payload.db
      dispatch(fetchMastersSentinelAction(payload, onMastersSentinelFetched))
    } else {
      sendEventTelemetry({
        event: TelemetryEvent.CONFIG_DATABASES_MANUALLY_SUBMITTED
      })

      dispatch(
        createInstanceStandaloneAction(payload, onMastersSentinelFetched)
      )
    }
  }
  const handleEditDatabase = (payload: any) => {
    dispatch(updateInstanceAction(payload, onDbEdited))
  }

  const handleUpdateEditingName = (name: string) => {
    const requiredFields = [
      'id',
      'host',
      'port',
      'username',
      'password',
      'tls',
      'sentinelMaster',
    ]
    const database = pick(editedInstance, ...requiredFields)
    dispatch(updateInstanceAction({ ...database, name }))
  }

  const autoFillFormDetails = (content: string): boolean => {
    try {
      const details = new ConnectionString(content)

      /* If a protocol exists, it should be a redis protocol */
      if (details.protocol && !REDIS_URI_SCHEMES.includes(details.protocol)) return false
      /*
       * Auto fill logic:
       * 1) If the port is parsed, we are sure that the user has indeed copied a connection string.
       *    '172.18.0.2:12000'                => {host: '172,18.0.2', port: 12000}
       *    'redis-12000.cluster.local:12000' => {host: 'redis-12000.cluster.local', port: 12000}
       *    'lorem ipsum'                     => {host: undefined, port: undefined}
       * 2) If the port is `undefined` but a redis URI scheme is present as protocol, we follow
       *    the "Scheme semantics" as mentioned in the official URI schemes.
       *    i)  redis:// - https://www.iana.org/assignments/uri-schemes/prov/redis
       *    ii) rediss:// - https://www.iana.org/assignments/uri-schemes/prov/rediss
       */
      if (
        details.port !== undefined
        || REDIS_URI_SCHEMES.includes(details.protocol || '')
      ) {
        setInitialValues({
          name: details.host || name || 'localhost:6379',
          host: details.hostname || host || 'localhost',
          port: `${details.port || port || 9443}`,
          username: details.user || '',
          password: details.password || '',
          tls: details.protocol === 'rediss',
        })
        /*
         * auto fill was successfull so return true
         */
        return true
      }
    } catch (err) {
      /* The pasted content is not a connection URI so ignore. */
      return false
    }
    return false
  }

  const editDatabase = (tlsSettings, values) => {
    const {
      name,
      host,
      port,
      username,
      password,
      sentinelMasterUsername,
      sentinelMasterPassword,
      ssh,
      sshHost,
      sshPort,
      sshUsername,
      sshPassword,
    } = values

    const database = {
      id: editedInstance?.id,
      name,
      host,
      port: +port,
      username,
      password,
    }

    const {
      useTls,
      servername,
      verifyServerCert,
      caCert,
      clientAuth,
      clientCert,
    } = tlsSettings

    if (useTls) {
      database.tls = useTls
      database.tlsServername = servername
      database.verifyServerCert = !!verifyServerCert

      if (typeof caCert?.new !== 'undefined') {
        database.caCert = {
          name: caCert?.new.name,
          certificate: caCert?.new.certificate,
        }
      }
      if (typeof caCert?.name !== 'undefined') {
        database.caCert = { id: caCert?.name }
      }

      if (clientAuth) {
        if (typeof clientCert.new !== 'undefined') {
          database.clientCert = {
            name: clientCert.new.name,
            certificate: clientCert.new.certificate,
            key: clientCert.new.key,
          }
        }

        if (typeof clientCert.id !== 'undefined') {
          database.clientCert = { id: clientCert.id }
        }
      }
    }

    if (connectionType === ConnectionType.Sentinel) {
      database.sentinelMaster = {}
      database.sentinelMaster.name = masterName
      database.sentinelMaster.username = sentinelMasterUsername
      database.sentinelMaster.password = sentinelMasterPassword
    }

    console.log('___ adeting db. values', values)

    if (ssh) {
      database.ssh = ssh
      database.sshHost = sshHost
      database.sshPort = +sshPort
      database.sshUsername = sshUsername
      database.sshPassword = sshPassword
    }

    handleEditDatabase(removeEmpty(database))
  }

  const addDatabase = (tlsSettings, values) => {
    const {
      name,
      host,
      port,
      username,
      password,
      db,
      sentinelMasterName,
      sentinelMasterUsername,
      sentinelMasterPassword,
      ssh,
      sshHost,
      sshPort,
      sshUsername,
      sshPassword,
    } = values
    const database: any = { name, host, port: +port, db: +db, username, password }

    const {
      useTls,
      servername,
      verifyServerCert,
      caCert,
      clientAuth,
      clientCert,
    } = tlsSettings

    if (useTls) {
      database.tls = useTls
      database.tlsServername = servername
      database.verifyServerCert = !!verifyServerCert
      if (typeof caCert?.new !== 'undefined') {
        database.caCert = {
          name: caCert?.new.name,
          certificate: caCert?.new.certificate,
        }
      }
      if (typeof caCert?.name !== 'undefined') {
        database.caCert = { id: caCert?.name }
      }

      if (clientAuth) {
        if (typeof clientCert.new !== 'undefined') {
          database.clientCert = {
            name: clientCert.new.name,
            certificate: clientCert.new.certificate,
            key: clientCert.new.key,
          }
        }

        if (typeof clientCert.id !== 'undefined') {
          database.clientCert = { id: clientCert.id }
        }
      }
    }

    if (isCloneMode && connectionType === ConnectionType.Sentinel) {
      database.sentinelMaster = {
        name: sentinelMasterName,
        username: sentinelMasterUsername,
        password: sentinelMasterPassword,
      }
    }

    console.log('___ adding db. values', values)

    if (ssh) {
      database.ssh = ssh
      database.sshHost = sshHost
      database.sshPort = +sshPort
      database.sshUsername = sshUsername
      database.sshPassword = sshPassword
    }

    handleSubmitDatabase(removeEmpty(database))

    const databasesCount: number = JSON.parse(
      localStorageService.get(BrowserStorageItem.instancesCount) || `${0}`
    )
    localStorageService.set(
      BrowserStorageItem.instancesCount,
      databasesCount + 1
    )
    onDbAdded()
  }

  const handleConnectionFormSubmit = (values) => {
    const {
      newCaCert,
      tls,
      sni,
      servername,
      newCaCertName,
      selectedCaCertName,
      tlsClientAuthRequired,
      verifyServerTlsCert,
      newTlsCertPairName,
      selectedTlsClientCertId,
      newTlsClientCert,
      newTlsClientKey,
    } = values

    values.ssh = !!values.ssh

    const tlsSettings = {
      useTls: tls,
      servername: (sni && servername) || undefined,
      verifyServerCert: verifyServerTlsCert,
      caCert:
        !tls || selectedCaCertName === NO_CA_CERT
          ? undefined
          : selectedCaCertName === ADD_NEW_CA_CERT
            ? {
              new: {
                name: newCaCertName,
                certificate: newCaCert,
              },
            }
            : {
              name: selectedCaCertName,
            },
      clientAuth: tls && tlsClientAuthRequired,
      clientCert: !tls
        ? undefined
        : typeof selectedTlsClientCertId === 'string'
          && tlsClientAuthRequired
          && selectedTlsClientCertId !== ADD_NEW
          ? { id: selectedTlsClientCertId }
          : selectedTlsClientCertId === ADD_NEW && tlsClientAuthRequired
            ? {
              new: {
                name: newTlsCertPairName,
                certificate: newTlsClientCert,
                key: newTlsClientKey,
              },
            }
            : undefined,
    }

    if (editMode && !isCloneMode) {
      editDatabase(tlsSettings, values)
    } else {
      addDatabase(tlsSettings, values)
    }
  }

  const handleOnClose = () => {
    if (isCloneMode) {
      sendEventTelemetry({
        event: TelemetryEvent.CONFIG_DATABASES_DATABASE_CLONE_CANCELLED,
        eventData: {
          databaseId: editedInstance?.id,
        }
      })
    }
    onClose?.()
  }

  const connectionFormData = {
    ...editedInstance,
    name,
    host,
    port,
    tls,
    username,
    password,
    connectionType,
    tlsClientAuthRequired,
    certificates,
    selectedTlsClientCertId,
    caCertificates,
    verifyServerTlsCert,
    selectedCaCertName,
    sentinelMasterUsername,
    sentinelMasterPassword,
  }

  const getSubmitButtonText = () => {
    if (instanceType === InstanceType.Sentinel) {
      return SubmitBtnText.ConnectToSentinel
    }
    if (isCloneMode) {
      return SubmitBtnText.CloneDatabase
    }
    if (editMode) {
      return SubmitBtnText.EditDatabase
    }
    return SubmitBtnText.AddDatabase
  }

  return (
    <div>
      <InstanceForm
        width={width}
        isResizablePanel={isResizablePanel}
        formFields={connectionFormData}
        initialValues={initialValues}
        loading={loadingStandalone || loadingSentinel}
        instanceType={instanceType}
        loadingMsg={
          editMode
            ? LoadingDatabaseText.EditDatabase
            : LoadingDatabaseText.AddDatabase
        }
        submitButtonText={getSubmitButtonText()}
        titleText={
          editMode
            ? TitleDatabaseText.EditDatabase
            : TitleDatabaseText.AddDatabase
        }
        onSubmit={handleConnectionFormSubmit}
        onClose={handleOnClose}
        onHostNamePaste={autoFillFormDetails}
        isEditMode={editMode}
        isCloneMode={isCloneMode}
        setIsCloneMode={setIsCloneMode}
        updateEditingName={handleUpdateEditingName}
        onAliasEdited={onAliasEdited}
      />
    </div>
  )
}

export default InstanceFormWrapper
