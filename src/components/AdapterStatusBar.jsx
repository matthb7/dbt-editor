import { useDispatch, useSelector } from 'react-redux';
import { toggleSetupPanel } from '../store/adapterSetupSlice';

export default function AdapterStatusBar() {
  const dispatch = useDispatch();
  const { status, isLoadingStatus } = useSelector((state) => state.adapterSetup);

  const savedConfig = status?.savedConfig;
  const adapterType = savedConfig?.adapterType || 'fabric';
  const adapterReady =
    adapterType === 'fabric' ? status?.fabricReady : status?.postgresReady;
  const azureCliReady =
    adapterType !== 'fabric' ||
    savedConfig?.authentication !== 'cli' ||
    (status?.azureCliInstalled && status?.azureCliLoggedIn);
  const secretsReady = !status?.secretRequired || status?.sessionSecretLoaded;
  const overallReady =
    status?.dbtInstalled &&
    adapterReady &&
    status?.profileExists &&
    savedConfig?.projectPath &&
    azureCliReady &&
    secretsReady;

  return (
    <div className="adapter-status-bar">
      <div className="adapter-status-copy">
        <p className="section-label">Adapter</p>
        <strong>{overallReady ? 'Ready to run' : 'Setup needed'}</strong>
        <span>
          {isLoadingStatus
            ? 'Checking local dbt environment...'
            : savedConfig
              ? `${savedConfig.adapterType} / profile ${savedConfig.profileName} / target ${savedConfig.targetName}`
              : 'No adapter configuration saved yet'}
        </span>
      </div>
      <div className="adapter-status-pills">
        <span className={`status-pill ${status?.dbtInstalled ? 'ok' : 'warn'}`}>dbt</span>
        <span className={`status-pill ${adapterReady ? 'ok' : 'warn'}`}>adapter</span>
        <span className={`status-pill ${status?.profileExists ? 'ok' : 'warn'}`}>profile</span>
        {adapterType === 'fabric' && savedConfig?.authentication === 'cli' ? (
          <span className={`status-pill ${azureCliReady ? 'ok' : 'warn'}`}>azure cli</span>
        ) : null}
        {status?.secretRequired ? (
          <span className={`status-pill ${status?.sessionSecretLoaded ? 'ok' : 'warn'}`}>
            secret
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="ghost-button"
        onClick={() => dispatch(toggleSetupPanel())}
      >
        {overallReady ? 'Edit adapter' : 'Configure adapter'}
      </button>
    </div>
  );
}
