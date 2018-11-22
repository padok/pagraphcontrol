
const {
	mapObjIndexed,
	map,
	merge,
	path,
} = require('ramda');

const r = require('r-dom');

const React = require('react');
const PropTypes = require('prop-types');

const Modal = require('react-modal');

const { connect } = require('react-redux');
const { bindActionCreators } = require('redux');

const {
	pulse: pulseActions,
	preferences: preferencesActions,
} = require('../../actions');

const {
	getPaiByTypeAndIndex,
} = require('../../selectors');

const { modules } = require('../../constants/pulse');

const { primaryPulseServer } = require('../../reducers/pulse');

const ConnectToServerModal = require('./connect-to-server');
const ConfirmationModal = require('./confirmation');
const NewGraphObjectModal = require('./new-graph-object');
const LoadModuleModal = require('./load-module');
const AddRemoteServerModal = require('./add-remote-server-modal');

Modal.setAppElement('#root');

Modal.defaultStyles = {
	overlay: {},
	content: {},
};

class Modals extends React.PureComponent {
	constructor(props) {
		super(props);

		this.initialState = {
			target: null,
			confirmation: null,
			continuation: null,

			connectToServerModalOpen: false,
			newGraphObjectModalOpen: false,
			loadModuleModalOpen: false,
			addRemoteServerModalOpen: false,

			modalDefaults: undefined,

			actions: {
				openConnectToServerModal: this.openConnectToServerModal.bind(this),

				openNewGraphObjectModal: this.openNewGraphObjectModal.bind(this),
				openLoadModuleModal: this.openLoadModuleModal.bind(this),
				openAddRemoteServerModal: this.openAddRemoteServerModal.bind(this),
			},
		};
		this.state = this.initialState;

		this.handleCancel = this.handleCancel.bind(this);
	}

	static getDerivedStateFromProps(props, state) {
		return {
			actions: merge(state.actions, mapObjIndexed((f, name) => function (...args) {
				const continuation = () => {
					props[name](...args);
					this.setState(this.initialState);
				};

				if (props.preferences.doNotAskForConfirmations) {
					return continuation();
				}

				const target = f.apply(this, args);

				if (!target) {
					return continuation();
				}

				this.setState({
					target,
					continuation,
					confirmation: name,
				});
			}, {
				unloadModuleByIndex(index) {
					const pai = getPaiByTypeAndIndex('module', index)(this.context.store.getState());

					if (pai && path([ pai.name, 'confirmUnload' ], modules)) {
						return pai;
					}

					return null;
				},
			})),
		};
	}

	openConnectToServerModal(modalDefaults) {
		this.setState({
			connectToServerModalOpen: true,
			modalDefaults,
		});
	}

	openNewGraphObjectModal() {
		this.setState({ newGraphObjectModalOpen: true });
	}

	openLoadModuleModal(modalDefaults) {
		this.setState({
			loadModuleModalOpen: true,
			modalDefaults,
		});
	}

	openAddRemoteServerModal() {
		this.setState({ addRemoteServerModalOpen: true });
	}

	handleCancel() {
		this.setState(this.initialState);
	}

	render() {
		const { preferences, toggle, children } = this.props;
		const { actions, target, confirmation, continuation } = this.state;

		return r(React.Fragment, [
			...[].concat(children({ actions: map(a => a.bind(this), actions) })),

			r(ConfirmationModal, {
				target,
				confirmation,
				onConfirm: continuation,
				onCancel: this.handleCancel,

				preferences,
				toggle,
			}),

			this.state.connectToServerModalOpen && r(ConnectToServerModal, {
				isOpen: true,
				onRequestClose: this.handleCancel,

				defaults: this.state.modalDefaults,
			}),

			r(NewGraphObjectModal, {
				isOpen: this.state.newGraphObjectModalOpen,
				onRequestClose: this.handleCancel,

				openLoadModuleModal: this.state.actions.openLoadModuleModal,
			}),

			this.state.loadModuleModalOpen && r(LoadModuleModal, {
				isOpen: true,
				onRequestClose: this.handleCancel,

				defaults: this.state.modalDefaults,
			}),

			r(AddRemoteServerModal, {
				isOpen: this.state.addRemoteServerModalOpen,
				onRequestClose: this.handleCancel,
			}),
		]);
	}
}

Modals.contextTypes = {
	store: PropTypes.any,
};

module.exports = connect(
	state => ({
		infos: state.pulse[primaryPulseServer].infos,
		preferences: state.preferences,
	}),
	dispatch => bindActionCreators(merge(pulseActions, preferencesActions), dispatch),
)(Modals);
