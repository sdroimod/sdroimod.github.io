import React, { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useUIStore } from '@/store/useUIStore';
import { Modal } from './Modal';
import { getElementColor, capitalize } from '@/lib/utils';
import { calculateStat } from '@/lib/stats-engine';
import { t } from '@/lib/i18n';
import { CONFIG } from '@/config/constants';

const boostKeyMap: Record<string, string> = {
  'speed': 'speedBoostTitle',
  'armor': 'armorBoostTitle',
  'magic': 'magicBoostTitle',
  'jump': 'jumpBoostTitle',
  'sword': 'swordBoostTitle',
  'dagger': 'daggerBoostTitle',
  'staff': 'staffBoostTitle',
  'axe': 'axeBoostTitle',
  'hammer': 'hammerBoostTitle',
  'spear': 'spearBoostTitle',
  'Frost': 'frost',
  'Immune against frost': 'immuneAgainstFrost',
  'Poisonous': 'poisonous'
};

interface NotificationProps {
  notification: any;
  nextNotifications?: any[];
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationProps> = ({
  notification,
  nextNotifications = [],
  onClose
}) => {
  const { items, uiTranslations, equipItem } = useGameStore((s) => ({
    items: s.items,
    uiTranslations: s.uiTranslations,
    equipItem: s.equipItem
  }));

  const { pushModal, incrementNotifShowCount, blockNotif, getNotifShowCount, language } = useUIStore((s) => ({
    pushModal: s.pushModal,
    incrementNotifShowCount: s.incrementNotifShowCount,
    blockNotif: s.blockNotif,
    getNotifShowCount: s.getNotifShowCount,
    language: s.language || 'en'
  }));

  const loc = (obj: any, key: string, fallback?: string) => {
    if (!obj) return fallback || '';
    if (language && obj[`${key}_${language}`]) return obj[`${key}_${language}`];
    return obj[key] || fallback || '';
  };
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const dontShowAgainRef = React.useRef(dontShowAgain);

  const type = notification.type;
  const content = notification.content || {};
  const action = notification.action || {};

  React.useEffect(() => {
    dontShowAgainRef.current = dontShowAgain;
  }, [dontShowAgain]);

  // Increment show count on mount, and handle block on unmount
  React.useEffect(() => {
    incrementNotifShowCount(notification.id);
    return () => {
      if (dontShowAgainRef.current) {
        blockNotif(notification.id);
      }
    };
  }, [notification.id, incrementNotifShowCount, blockNotif]);

  const getShowCount = () => {
    return getNotifShowCount(notification.id);
  };

  const handleAction = () => {
    // blockNotif is now handled in the unmount effect to cover all close methods

    // 2. Perform CTA Action
    switch (action.type) {
      case 'equip-item': {
        const itemId = content['item-id'];
        const item = items.find((i) => i.id === itemId || i.name === itemId);
        if (item) {
          const initializedItem = {
            ...item,
            currentLevel: item.currentLevel === undefined ? (item.levelMax || 0) : item.currentLevel,
            element: item.element || 'neutral',
            originalElement: item.originalElement || item.element || 'neutral'
          };
          equipItem(initializedItem);
        }
        break;
      }
      case 'open-url': {
        const url = content.url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        break;
      }
      default:
        break;
    }

    // 3. Close this modal
    onClose();

    // 4. Trigger next notification modal in queue if available
    if (nextNotifications && nextNotifications.length > 0) {
      const [next, ...remaining] = nextNotifications;
      setTimeout(() => {
        pushModal({
          type: 'notification',
          props: {
            notification: next,
            nextNotifications: remaining
          }
        });
      }, 400); // Small delay between modals
    }
  };

  // Render sub-sections based on type
  const renderContent = () => {
    switch (type) {
      case 'update-stat':
        return <div className="notif-message text-center whitespace-pre-wrap">{loc(content, 'message')}</div>;

      case 'update-item': {
        const itemId = content['item-id'];
        const item = items.find((i) => i.id === itemId || i.name === itemId);
        
        if (!item) {
          return <div className="notif-message text-center">Item "{itemId}" updated.</div>;
        }

        const elColor = getElementColor(item.element || 'neutral');
        const spritePath = (item.sprite && item.sprite.startsWith('/')) ? item.sprite.substring(1) : (item.sprite || '');
        const currentLvl = item.currentLevel !== undefined ? item.currentLevel : item.levelMax;
        const statVal = isWeapon
          ? calculateStat(item.stats?.damage, currentLvl, item.levelMax)
          : calculateStat(item.stats?.armor, currentLvl, item.levelMax);

        return (
          <div className="flex flex-col gap-3">
            <div className="item-detail-container">
              <div className="item-slot item-detail-slot" style={{ border: `1px solid ${elColor}` }}>
                <img src={spritePath} alt={item.displayName || item.name} style={item.subType === 'spear' ? { transform: 'scale(1.5) rotate(15deg)' } : undefined} />
              </div>
              <div className="item-detail-info">
                <div className="item-detail-name" style={{ textShadow: `0 0 5px ${elColor}80`, '--item-color': elColor } as React.CSSProperties}>
                  {item.displayName || item.name}
                </div>
                <div className="item-detail-level">
                  {t(uiTranslations, 'label_level') || 'Level'}: <span className="item-detail-level-value">{currentLvl} / {item.levelMax}</span>
                </div>
                <div className="item-detail-tags">
                  <span className="item-detail-element" style={{ background: elColor }}>
                    {t(uiTranslations, item.element === 'neutral' ? 'neuralElement' : `${item.element}Element`) || capitalize(item.element || '')}
                  </span>
                </div>
              </div>
            </div>
            <div className="stat-row">
              <span>{item.type === 'weapon' ? t(uiTranslations, 'stat_damage') || 'Damage' : t(uiTranslations, 'stat_armor') || 'Armor'}</span>
              <strong style={{ fontSize: '1.1em' }}>{statVal}</strong>
            </div>

            {/* Boosts Tag list */}
            {item.boosts && (
              <div style={{ marginTop: '5px', paddingTop: '5px' }}>
                {Object.entries(item.boosts)
                  .filter(([_, value]) => value !== 1)
                  .map(([key, value]) => {
                    const isEl = CONFIG.ELEMENTS.includes(key as any);
                    const bColor = isEl ? getElementColor(key) : '#ffb142';
                    const tKey = boostKeyMap[key] || (isEl ? (key === 'neutral' ? 'neuralElement' : `${key}Element`) : key);
                    const translatedBoostLabel = t(uiTranslations, tKey) || key;
                    return (
                      <div key={key} className="boost-tag">
                        <span style={{ color: 'var(--theme-popup-text, #888)', opacity: 0.8, textTransform: 'capitalize' }}>{translatedBoostLabel}</span>
                        <span style={{ color: bColor }} className="boost-value">+{Math.round((value - 1) * 100)}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      }

      case 'new-video': {
        const thumbSrc = content.thumbnail || '';
        return (
          <div className="notif-content text-center flex flex-col items-center">
            {thumbSrc && (
              <img
                className="notif-thumbnail max-w-full rounded-lg mb-3 border border-white/10"
                src={thumbSrc}
                alt="Video thumbnail"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
            <div className="notif-title text-lg font-bold">{loc(content, 'title', 'New Video')}</div>
          </div>
        );
      }

      case 'new-game': {
        const imgSrc = content.image || '';
        return (
          <div className="notif-content text-center flex flex-col items-center">
            {imgSrc && (
              <img
                className="notif-thumbnail max-w-full rounded-lg mb-3 border border-white/10"
                src={imgSrc}
                alt="Game banner"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
            <div className="notif-title text-lg font-bold">{loc(content, 'title', 'New Game')}</div>
            {content.description && <div className="notif-desc opacity-70 text-sm mt-1.5 whitespace-pre-wrap">{loc(content, 'description')}</div>}
          </div>
        );
      }

      default:
        return <div className="notif-message whitespace-pre-wrap">{JSON.stringify(content)}</div>;
    }
  };

  // Resolve title
  const getModalTitle = () => {
    const customTitle = loc(notification, 'title');
    if (customTitle) return customTitle;

    switch (type) {
      case 'update-stat': return '📢 Newsletter';
      case 'update-item': return '🆕 Item Update';
      case 'new-video': return '🎬 New Video';
      case 'new-game': return '🎮 New Game 🔥';
      default: return '📢 Notice';
    }
  };

  const isWeapon = type === 'update-item' && items.find(i => i.id === content['item-id'])?.type === 'weapon';

  const showCount = getShowCount();
  const threshold = notification['show-time-before-block'] || 1;
  const allowDismiss = showCount >= threshold;

  const footer = (
    <div className="flex flex-col gap-2 w-full">
      {/* Checkbox block option */}
      {allowDismiss && (
        <label className="notif-dont-show flex items-center justify-center gap-2 text-xs opacity-70 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="accent-accent-gold w-4 h-4"
          />
          <span>Don't show again</span>
        </label>
      )}

      {/* Primary CTA button */}
      <button
        className={`btn btn-block justify-center ${action.type === 'close' ? 'btn-outline' : 'btn-primary'}`}
        onClick={handleAction}
      >
        {loc(action, 'label', 'OK')}
      </button>
    </div>
  );

  return (
    <Modal
      title={getModalTitle()}
      onClose={onClose}
      footer={footer}
      preventClose={!allowDismiss} // Prevent escaping if show count threshold not reached
    >
      <div className="notif-content">{renderContent()}</div>
    </Modal>
  );
};
export default NotificationModal;
