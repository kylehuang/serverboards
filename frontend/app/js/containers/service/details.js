import View from 'app/components/service/details'
import event from 'app/utils/event'
import { services_update_catalog } from 'app/actions/service'

var Container = event.subscribe_connect(
  (state, props) => {
    const service = state.serverboard.serverboard.services.find( (s) => s.uuid == props.subsection )
    const service_template = (state.serverboard.catalog || []).find( (s) => s.type == service.type ) || { name: service.type }
    const tab = props.location.state.tab || 'details'
    return {
      service,
      service_template,
      tab
    }
  },
  (dispatch) => ({}),
  [],
  [services_update_catalog]
)(View)

export default Container
