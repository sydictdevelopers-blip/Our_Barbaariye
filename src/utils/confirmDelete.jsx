import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import i18n from '../i18n/i18n';

/**
 * confirmDelete – imperative replacement for `swalConfirm()` at delete callsites.
 * Mounts <DeleteConfirmModal/> via createRoot, returns Promise<boolean>.
 *
 * Usage:
 *   if (await confirmDelete({ id: row.id, label: 'Class' })) doDelete(row);
 *
 * Options:
 *   - id            : the record id to surface in the modal (string | number)
 *   - label         : short type label, e.g. "Class", "Student" (string)
 *   - recordPreview : extra context line shown under the id (ReactNode | string)
 */
export function confirmDelete(options = {}) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const finish = (result) => {
      // Re-render with open=false so AnimatePresence runs its exit animation,
      // then unmount once the animation is done.
      root.render(
        <I18nextProvider i18n={i18n}>
          <DeleteConfirmModal {...options} open={false} onConfirm={() => {}} onCancel={() => {}} />
        </I18nextProvider>
      );
      setTimeout(() => {
        root.unmount();
        container.remove();
        resolve(result);
      }, 280);
    };

    root.render(
      <I18nextProvider i18n={i18n}>
        <DeleteConfirmModal
          {...options}
          open
          onConfirm={() => finish(true)}
          onCancel={() => finish(false)}
        />
      </I18nextProvider>
    );
  });
}
