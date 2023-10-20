import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'

import { useParams } from 'react-router-dom'
import {
  appContextBrowserTree,
  resetBrowserTree,
  appContextDbConfig,
  setBrowserTreeNodesOpen,
} from 'uiSrc/slices/app/context'
import { constructKeysToTree } from 'uiSrc/helpers'
import VirtualTree from 'uiSrc/components/virtual-tree'
import TreeViewSVG from 'uiSrc/assets/img/icons/treeview.svg'
import { KeysStoreData } from 'uiSrc/slices/interfaces/keys'
import { Nullable, bufferToString } from 'uiSrc/utils'
import { IKeyPropTypes } from 'uiSrc/constants/prop-types/keys'
import { KeyTypes, ModulesKeyTypes } from 'uiSrc/constants'
import { RedisResponseBuffer, RedisString } from 'uiSrc/slices/interfaces'
import { deleteKeyAction, selectedKeyDataSelector } from 'uiSrc/slices/browser/keys'
import { TelemetryEvent, sendEventTelemetry } from 'uiSrc/telemetry'
import { GetKeyInfoResponse } from 'apiSrc/modules/browser/dto'

import NoKeysMessage from '../no-keys-message'
import styles from './styles.module.scss'

export interface Props {
  keysState: KeysStoreData
  loading: boolean
  deleting: boolean
  commonFilterType: Nullable<KeyTypes>
  selectKey: ({ rowData }: { rowData: any }) => void
  loadMoreItems: (
    oldKeys: IKeyPropTypes[],
    { startIndex, stopIndex }: { startIndex: number, stopIndex: number },
  ) => void
  onDelete: (key: RedisResponseBuffer) => void
  onAddKeyPanel: (value: boolean) => void
  onBulkActionsPanel: (value: boolean) => void
}

export const firstPanelId = 'tree'
export const secondPanelId = 'keys'

const parseKeyNames = (keys: GetKeyInfoResponse[]) =>
  keys.map((item) =>
    ({ ...item, nameString: item.nameString ?? bufferToString(item.name) }))

const KeyTree = forwardRef((props: Props, ref) => {
  const {
    selectKey,
    loadMoreItems,
    loading,
    keysState,
    onDelete,
    commonFilterType,
    deleting,
    onAddKeyPanel,
    onBulkActionsPanel,
  } = props

  const { instanceId } = useParams<{ instanceId: string }>()
  const { openNodes } = useSelector(appContextBrowserTree)
  const { treeViewDelimiter: delimiter = '', treeViewSort: sorting } = useSelector(appContextDbConfig)
  const { nameString: selectedKeyName = null } = useSelector(selectedKeyDataSelector) ?? {}

  const [statusOpen, setStatusOpen] = useState(openNodes)
  const [constructingTree, setConstructingTree] = useState(false)
  const [firstDataLoaded, setFirstDataLoaded] = useState<boolean>(!!keysState.keys.length)
  const [items, setItems] = useState<IKeyPropTypes[]>(parseKeyNames(keysState.keys ?? []))

  const dispatch = useDispatch()

  useImperativeHandle(ref, () => ({
    handleLoadMoreItems(config: { startIndex: number; stopIndex: number }) {
      onLoadMoreItems(config)
    }
  }))

  useEffect(() => {
    openSelectedKey(selectedKeyName)
  }, [])

  useEffect(() => {
    setStatusOpen(openNodes)
  }, [openNodes])

  // open all parents for selected key
  const openSelectedKey = (selectedKeyName: Nullable<string> = '') => {
    if (selectedKeyName) {
      const parts = selectedKeyName.split(delimiter)
      const parents = parts.map((_, index) => parts.slice(0, index + 1).join(delimiter) + delimiter)

      // remove key name from parents
      parents.pop()

      setTimeout(() => {
        parents.forEach((parent) => handleStatusOpen(parent, true))
      }, 0)
    }
  }

  useEffect(() => {
    setItems(parseKeyNames(keysState.keys))

    if (keysState.keys?.length === 0) {
      updateSelectedKeys()
    }
  }, [keysState.keys])

  useEffect(() => {
    setFirstDataLoaded(true)
    setItems(parseKeyNames(keysState.keys))
  }, [sorting, delimiter, keysState.lastRefreshTime])

  useEffect(() => {
    openSelectedKey(selectedKeyName)
  }, [selectedKeyName])

  const onLoadMoreItems = (props: { startIndex: number, stopIndex: number }) => {
    const formattedAllKeys = parseKeyNames(keysState.keys)
    loadMoreItems?.(formattedAllKeys, props)
  }

  // select default leaf "Keys" after each change delimiter, filter or search
  const updateSelectedKeys = () => {
    dispatch(resetBrowserTree())
    openSelectedKey(selectedKeyName)
  }

  const handleStatusOpen = (name: string, value:boolean) => {
    setStatusOpen((prevState) => {
      const newState = { ...prevState }
      // add or remove opened node
      if (!value) {
        delete newState[name]
      } else {
        newState[name] = value
      }

      dispatch(setBrowserTreeNodesOpen(newState))
      return newState
    })
  }

  const handleStatusSelected = (name: RedisString) => {
    selectKey({ rowData: { name } })
  }

  const handleDeleteLeaf = (key: RedisResponseBuffer) => {
    dispatch(deleteKeyAction(key, () => {
      onDelete(key)
    }))
  }

  const handleDeleteClicked = (type: KeyTypes | ModulesKeyTypes) => {
    sendEventTelemetry({
      event: TelemetryEvent.TREE_VIEW_KEY_DELETE_CLICKED,
      eventData: {
        databaseId: instanceId,
        keyType: type,
        source: 'keyList'
      }
    })
  }

  if (keysState.keys.length === 0) {
    const NoItemsMessage = () => {
      if (loading || !firstDataLoaded) {
        return <span>loading...</span>
      }

      return (
        <NoKeysMessage
          total={keysState.total}
          scanned={keysState.scanned}
          onAddKeyPanel={onAddKeyPanel}
          onBulkActionsPanel={onBulkActionsPanel}
        />
      )
    }

    return (
      <div className={cx(styles.content)}>
        <div className={cx(styles.noKeys)}>
          <NoItemsMessage />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <VirtualTree
          items={items}
          loadingIcon={TreeViewSVG}
          delimiter={delimiter}
          sorting={sorting}
          deleting={deleting}
          statusSelected={selectedKeyName}
          statusOpen={statusOpen}
          loading={loading || constructingTree}
          commonFilterType={commonFilterType}
          setConstructingTree={setConstructingTree}
          webworkerFn={constructKeysToTree}
          onStatusSelected={handleStatusSelected}
          onStatusOpen={handleStatusOpen}
          onDeleteClicked={handleDeleteClicked}
          onDeleteLeaf={handleDeleteLeaf}
        />
      </div>
    </div>
  )
})

export default KeyTree
