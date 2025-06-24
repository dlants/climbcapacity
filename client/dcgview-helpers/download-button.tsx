import './download-button.scss';

import * as DCGView from 'dcgview';
import * as Browser from 'lib/browser';

type Props = {
  data: () => Blob;
  enabled: () => boolean;
  filename: () => string;
  text: () => string;
  buttonType?: () => 'primary' | 'secondary' | 'link';
  triggerLogEvent?: () => void;
};

function isSafariLessThan11() {
  if (!Browser.IS_SAFARI) return false;
  const match = navigator.userAgent.match(/Version\/(\d+)/);
  if (!match || !match[1]) return false;
  return parseFloat(match[1]) < 11;
}

function isDirectDownloadSupported() {
  //edge has a bug where it opens in a new window
  //safari 10.1 claims to support this, but has a bug (filed by jason) where subsequent links behave incorrectly
  //behavior's ok even without this direct download button, so we just disable this feature for busted browsers
  return (
    !Browser.IS_IE &&
    !isSafariLessThan11() &&
    typeof document.createElement('a').download !== 'undefined'
  );
}

export function canDownload() {
  return (
    isDirectDownloadSupported() || (navigator as any).msSaveBlob !== undefined
  );
}

export default class DownloadButton extends DCGView.View<Props> {
  private supportsDirectDownload: boolean;
  private downloadLink: HTMLAnchorElement;
  private cachedObjectURL: string;

  init() {
    this.supportsDirectDownload = isDirectDownloadSupported();
  }

  template() {
    return (
      <a
        role="button"
        tabIndex={() => (this.props.enabled() ? 0 : -1)}
        aria-disabled={() => (!this.props.enabled() ? true : undefined)}
        class={() => ({
          'dcg-download-button': true,
          'dcg-btn-blue': this.props.buttonType?.() === 'primary',
          'dcg-btn-blue-outline': this.props.buttonType?.() === 'secondary',
          'dcg-blue-link': this.props.buttonType?.() === 'link',
          'dcg-disabled': !this.props.enabled()
        })}
        didMount={this.bindFn(this.didMountDownload)}
        didUnmount={this.bindFn(this.didUnmountDownload)}
        didUpdate={this.bindFn(this.didUpdate)}
        download={() =>
          this.supportsDirectDownload ? this.props.filename() : undefined
        }
        onTap={(evt: JQuery.TriggeredEvent) => {
          this.props.triggerLogEvent?.();
          if (this.supportsDirectDownload) return;
          if (!(navigator as any).msSaveOrOpenBlob) return;
          const data = this.props.data();
          if (!data) return;
          (navigator as any).msSaveOrOpenBlob(data, this.props.filename());
          evt.preventDefault();
        }}
      >
        <i class="dcg-icon-download" aria-hidden="true" />
        <span>{() => this.props.text()}</span>
      </a>
    );
  }

  didMountDownload(downloadLink: HTMLAnchorElement) {
    this.downloadLink = downloadLink;
    this.didUpdate();
  }

  didUnmountDownload() {
    this.revokeBlobURL();
  }

  didUpdate() {
    this.updateDownloadURL();
    if (this.cachedObjectURL) this.downloadLink.href = this.cachedObjectURL;
  }

  updateDownloadURL() {
    this.revokeBlobURL();
    if (!this.supportsDirectDownload) return;
    const data = this.props.data();
    if (!data) return;
    this.cachedObjectURL = URL.createObjectURL(data);
  }

  // important cleanup so that the data can be garbage collected
  revokeBlobURL() {
    if (this.cachedObjectURL) URL.revokeObjectURL(this.cachedObjectURL);
  }
}
