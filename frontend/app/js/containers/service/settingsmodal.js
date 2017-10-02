import React from 'react'
import SettingsView from 'app/components/service/settingsmodal'
import connect from 'app/containers/connect'
import { services_update_catalog, service_update } from 'app/actions/service'
import { set_modal } from 'app/actions/modal'

var Settings = connect({
  state: (state) => {
    return {
      service_catalog: state.services.catalog
    }
  },
  handlers: (dispatch) => ({
    onUpdate: (uuid, data) => dispatch( service_update(uuid, data) ),
    onClose: () => dispatch( set_modal(false) )
  }),
  store_enter: [services_update_catalog]
})(SettingsView)

export default Settings
