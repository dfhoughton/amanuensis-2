import { useEffect } from "react"
import { configuration } from "../util/database"
import { Action, errorHandler } from "../util/reducer"
import { AppState } from "../types/common"

// make sure the app state object has a defined configuration attribute
export function useEnsureConfiguration(
  state: AppState,
  dispatch: React.Dispatch<Action>
) {
  useEffect(() => {
    if (state.config) return
    configuration()
      .then((c) => {
        dispatch({ action: "config", config: c ?? {} })
      })
      .catch(errorHandler(dispatch))
  }, [])
}
