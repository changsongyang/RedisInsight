import { cloneDeep } from 'lodash'
import { DEFAULT_DELIMITER, KeyTypes } from 'uiSrc/constants'
import { getTreeLeafField } from 'uiSrc/utils'

import {
  cleanup,
  initialStateDefault,
  mockedStore,
} from 'uiSrc/utils/test-utils'
import reducer, {
  initialState,
  setAppContextInitialState,
  setAppContextConnectedInstanceId,
  setBrowserKeyListDataLoaded,
  setBrowserSelectedKey,
  setBrowserPatternScrollPosition,
  setBrowserPanelSizes,
  setWorkbenchScript,
  setWorkbenchVerticalPanelSizes,
  setLastPageContext,
  appContextSelector,
  appContextBrowser,
  appContextWorkbench,
  setWorkbenchEAItem,
  appContextWorkbenchEA,
  setWorkbenchEAItemScrollTop,
  resetWorkbenchEAItem,
  setBrowserTreeNodesOpen,
  setBrowserTreePanelSizes,
  resetBrowserTree,
  appContextBrowserTree,
  setBrowserTreeSelectedLeaf,
  updateBrowserTreeSelectedLeaf,
  setBrowserTreeDelimiter,
  setBrowserIsNotRendered,
  setBrowserRedisearchScrollPosition,
} from '../../app/context'

jest.mock('uiSrc/services', () => ({
  ...jest.requireActual('uiSrc/services'),
}))

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('slices', () => {
  describe('setAppContextInitialState', () => {
    it('should properly set initial state', () => {
      const nextState = reducer(initialState, setAppContextInitialState())
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })
      expect(appContextSelector(rootState)).toEqual(initialState)
    })

    it('should properly set initial state with existing contextId', () => {
      // Arrange
      const contextInstanceId = '12312-3123'
      const prevState = {
        ...initialState,
        contextInstanceId,
        browser: {
          keyList: {
            isDataLoaded: true,
            scrollTopPosition: 100,
            selectedKey: 'some key'
          },
          tree: {
            delimiter: '-',
          },
          bulkActions: {
            opened: true,
          }
        },
        workbench: {
          script: '123123',
        },
        pubsub: {
          channel: '123123',
          message: '123123'
        },
        analytics: {
          lastViewedPage: 'zxczxc'
        }
      }
      const state = {
        ...initialState,
        contextInstanceId
      }

      // Act
      const nextState = reducer(prevState, setAppContextInitialState())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setAppContextConnectedInstanceId', () => {
    it('should properly set id', () => {
      // Arrange
      const contextInstanceId = '12312-3123'
      const state = {
        ...initialState,
        contextInstanceId
      }

      // Act
      const nextState = reducer(initialState, setAppContextConnectedInstanceId(contextInstanceId))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setBrowserKeyListDataLoaded', () => {
    it('should properly set context is data loaded', () => {
      // Arrange
      const isDataLoaded = true
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          isDataLoaded
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserKeyListDataLoaded(isDataLoaded))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserSelectedKey', () => {
    it('should properly set selectedKey', () => {
      // Arrange
      const selectedKey = 'nameOfKey'
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          selectedKey
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserSelectedKey(selectedKey))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserPatternScrollPosition', () => {
    it('should properly set scroll position of keyList', () => {
      // Arrange
      const scrollPatternTopPosition = 530
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          scrollPatternTopPosition
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserPatternScrollPosition(scrollPatternTopPosition))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserRedisearchScrollPosition', () => {
    it('should properly set scroll position of keyList', () => {
      // Arrange
      const scrollRedisearchTopPosition = 530
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          scrollRedisearchTopPosition
        }
      }

      // Act
      const nextState = reducer(
        initialState,
        setBrowserRedisearchScrollPosition(scrollRedisearchTopPosition)
      )

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserPanelSizes', () => {
    it('should properly set browser panel widths', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.browser,
        panelSizes
      }

      // Act
      const nextState = reducer(initialState, setBrowserPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchScript', () => {
    it('should properly set workbench script', () => {
      // Arrange
      const script = 'set 1 1 // 215 hset 5 21'
      const state = {
        ...initialState.workbench,
        script
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchScript(script))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchVerticalPanelSizes', () => {
    it('should properly set wb panel sizes', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.workbench,
        panelSizes: {
          ...initialState.workbench.panelSizes,
          vertical: panelSizes
        }
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchVerticalPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchEAItem', () => {
    it('should properly set path to opened guide page', () => {
      // Arrange
      const prevState = {
        ...initialState,
        workbench: {
          ...initialState.workbench,
          enablementArea: {
            itemPath: 'static/enablement-area/guides/guide1.html',
            itemScrollTop: 200,
          }
        },
      }
      const itemPath = 'static/enablement-area/guides/guide2.html'
      const state = {
        ...initialState.workbench.enablementArea,
        itemPath,
        itemScrollTop: 0,
      }

      // Act
      const nextState = reducer(prevState, setWorkbenchEAItem(itemPath))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbenchEA(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchEAItemScrollTop', () => {
    it('should properly set state', () => {
      // Arrange
      const state = {
        ...initialState.workbench.enablementArea,
        itemScrollTop: 200,
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchEAItemScrollTop(200))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbenchEA(rootState)).toEqual(state)
    })
  })

  describe('resetWorkbenchEAItem', () => {
    it('should properly reset enablement-area context', () => {
      // Arrange
      const prevState = {
        ...initialState,
        workbench: {
          ...initialState.workbench,
          enablementArea: {
            itemPath: 'static/enablement-area/guides/guide1.html',
            itemScrollTop: 200,
          }
        },
      }
      const state = {
        ...initialState.workbench.enablementArea,
        itemPath: '',
        itemScrollTop: 0,
      }

      // Act
      const nextState = reducer(prevState, resetWorkbenchEAItem())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbenchEA(rootState)).toEqual(state)
    })
  })

  describe('setLastPageContext', () => {
    it('should properly set last page', () => {
      // Arrange
      const lastPage = 'workbench'
      const state = {
        ...initialState,
        lastPage
      }

      // Act
      const nextState = reducer(initialState, setLastPageContext(lastPage))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreeNodesOpen', () => {
    it('should properly set open nodes in the tree', () => {
      // Arrange
      const openNodes = {
        '1o2313': true,
        eu12313: false,
      }
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            openNodes
          }
        },
      }

      const state = {
        ...initialState.browser.tree,
        openNodes
      }

      // Act
      const nextState = reducer(prevState, setBrowserTreeNodesOpen(openNodes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreeSelectedLeaf', () => {
    it('should properly set selected keys in the tree', () => {
      // Arrange
      const selectedLeaf = {
        [getTreeLeafField(DEFAULT_DELIMITER)]: {
          test: {
            name: 'test',
            type: KeyTypes.Hash,
            ttl: 123,
            size: 123,
            length: 321
          }
        }
      }
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            selectedLeaf
          }
        },
      }

      const state = {
        ...initialState.browser.tree,
        selectedLeaf
      }

      // Act
      const nextState = reducer(prevState, setBrowserTreeSelectedLeaf(selectedLeaf))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreePanelSizes', () => {
    it('should properly set browser tree panel widths', () => {
      // Arrange
      const panelSizes = {
        first: 50,
        second: 400
      }
      const state = {
        ...initialState.browser.tree,
        panelSizes
      }

      // Act
      const nextState = reducer(initialState, setBrowserTreePanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('setBrowserIsNotRendered', () => {
    it('should properly set browser is not rendered value', () => {
      // Arrange
      const isNotRendered = false
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          isNotRendered
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserIsNotRendered(isNotRendered))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreeDelimiter', () => {
    it('should properly set browser tree delimiter', () => {
      // Arrange
      const delimiter = '_'

      const state = {
        ...initialState.browser.tree,
        delimiter
      }

      // Act
      const nextState = reducer(initialState, setBrowserTreeDelimiter(delimiter))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('resetBrowserTree', () => {
    it('should properly set last page', () => {
      // Arrange
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            openNodes: {
              test: true
            },
            selectedLeaf: {
              [getTreeLeafField(DEFAULT_DELIMITER)]: {
                test: {
                  name: 'test',
                  type: KeyTypes.Hash,
                  ttl: 123,
                  size: 123,
                  length: 321
                }
              }
            }
          }
        },
      }
      const state = {
        ...initialState.browser.tree,
        openNodes: {},
        selectedLeaf: {}
      }

      // Act
      const nextState = reducer(prevState, resetBrowserTree())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('updateBrowserTreeSelectedLeaf', () => {
    it('should properly update selected leaf and add a new fitted key', () => {
      const payload = {
        key: 'test',
        newKey: 'test2'
      }
      // Arrange
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            selectedLeaf: {
              [getTreeLeafField(DEFAULT_DELIMITER)]: {
                [payload.key]: {
                  name: payload.key,
                  type: KeyTypes.Hash,
                  ttl: 123,
                  size: 123,
                  length: 321
                }
              }
            }
          }
        },
      }
      const state = {
        ...initialState.browser.tree,
        openNodes: {},
        selectedLeaf: {
          [getTreeLeafField(DEFAULT_DELIMITER)]: {
            [payload.newKey]: {
              name: payload.newKey,
              type: KeyTypes.Hash,
              ttl: 123,
              size: 123,
              length: 321
            } }
        }
      }

      // Act
      const nextState = reducer(prevState, updateBrowserTreeSelectedLeaf(payload))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
    it("should properly update selected leaf and remove old key (new key does't fit)", () => {
      const payload = {
        key: 'test',
        newKey: 'test:2'
      }
      // Arrange
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            selectedLeaf: {
              [getTreeLeafField(DEFAULT_DELIMITER)]: {
                [payload.key]: {
                  name: payload.key,
                  type: KeyTypes.Hash,
                  ttl: 123,
                  size: 123,
                  length: 321
                },
                test2: {
                  name: 'test2',
                  type: KeyTypes.Hash,
                  ttl: 123,
                  size: 123,
                  length: 321
                }
              }
            }
          }
        },
      }
      const state = {
        ...initialState.browser.tree,
        openNodes: {},
        selectedLeaf: {
          [getTreeLeafField(DEFAULT_DELIMITER)]: {
            test2: {
              name: 'test2',
              type: KeyTypes.Hash,
              ttl: 123,
              size: 123,
              length: 321
            },
          }
        }
      }

      // Act
      const nextState = reducer(prevState, updateBrowserTreeSelectedLeaf(payload))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })
})
