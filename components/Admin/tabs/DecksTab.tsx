// =====================================================================
// 後台「卡牌 / 牌組」分頁 —— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { Card, Deck, DeckCard } from '@/types';

interface DecksTabProps {
  cards: Card[];
  decks: Deck[];
  deckCards: DeckCard[];
  isSyncing: boolean;
  onCreateCard: (cardData: Omit<Card, 'id' | 'created_at'>) => Promise<void>;
  onCreateDeck: (name: string, isTemplate: boolean, cardIds: { cardId: string; count: number }[]) => Promise<void>;
}

export function DecksTab({ cards, decks, deckCards, isSyncing, onCreateCard, onCreateDeck }: DecksTabProps) {
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardElement, setCardElement] = useState<'water' | 'fire' | 'wind' | 'earth'>('water');
  const [cardRarity, setCardRarity] = useState<'N' | 'R' | 'SR' | 'SSR'>('N');
  const [cardImgUrl, setCardImgUrl] = useState('');
  const [deckName, setDeckName] = useState('');
  const [selectedCards, setSelectedCards] = useState<Record<string, number>>({});
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle) return;
    await onCreateCard({
      title: cardTitle,
      description: cardDesc,
      element_type: cardElement,
      rarity: cardRarity,
      image_url: cardImgUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300'
    });
    setCardTitle('');
    setCardDesc('');
    setCardImgUrl('');
    alert('卡牌建立成功！');
  };

  const handleCreateDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName) return;
    const cardsToSubmit = Object.entries(selectedCards)
      .filter(([_, count]) => count > 0)
      .map(([cardId, count]) => ({ cardId, count }));
    
    if (cardsToSubmit.length === 0) {
      alert('請至少選擇一張卡牌放入排組！');
      return;
    }

    await onCreateDeck(deckName, true, cardsToSubmit);
    setDeckName('');
    setSelectedCards({});
    alert('預設排組建立成功！');
  };

  const handleCardCountChange = (cardId: string, amount: number) => {
    setSelectedCards(prev => {
      const current = prev[cardId] || 0;
      const next = Math.max(0, current + amount);
      return { ...prev, [cardId]: next };
    });
  };

  return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
            {/* 建立新卡牌 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-1">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Layers size={16} className="text-red-500" />
                建立新卡牌
              </h3>
              <form onSubmit={handleCreateCard} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">卡牌稱號</label>
                  <input
                    required
                    type="text"
                    value={cardTitle}
                    onChange={e => setCardTitle(e.target.value)}
                    placeholder="例如：卓越心錨卡"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">卡牌加成說明</label>
                  <textarea
                    required
                    rows={2}
                    value={cardDesc}
                    onChange={e => setCardDesc(e.target.value)}
                    placeholder="如：每日定課經驗加成 10%"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">屬性</label>
                    <select
                      value={cardElement}
                      onChange={e => setCardElement(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                    >
                      <option value="water">水屬性 (調和)</option>
                      <option value="fire">火屬性 (爆發)</option>
                      <option value="wind">風屬性 (身捷)</option>
                      <option value="earth">地屬性 (穩重)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">稀有度</label>
                    <select
                      value={cardRarity}
                      onChange={e => setCardRarity(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                    >
                      <option value="N">N</option>
                      <option value="R">R</option>
                      <option value="SR">SR</option>
                      <option value="SSR">SSR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">卡面圖片連結 (選填)</label>
                  <input
                    type="text"
                    value={cardImgUrl}
                    onChange={e => setCardImgUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full btn-action py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                >
                  確認建立卡牌
                </button>
              </form>
            </section>

            {/* 建立預設排組 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-2">
              <h3 className="font-black text-white text-base">
                🛡️ 配置系統預設套牌 (Deck Templates)
              </h3>
              <form onSubmit={handleCreateDeckSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">套牌名稱</label>
                  <input
                    required
                    type="text"
                    value={deckName}
                    onChange={e => setDeckName(e.target.value)}
                    placeholder="例如：新手必備定課加速流"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-2">挑選卡牌放入排組</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {cards?.map(card => {
                      const count = selectedCards[card.id] || 0;
                      return (
                        <div key={card.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                card.rarity === 'SSR' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                              }`}>{card.rarity}</span>
                              <span className="font-bold text-xs text-white">{card.title}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{card.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCardCountChange(card.id, -1)}
                              className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center hover:text-white"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-white min-w-4 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={() => handleCardCountChange(card.id, 1)}
                              className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full btn-action py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                >
                  儲存並發布預設排組
                </button>
              </form>
            </section>
          </div>

          {/* 現有卡牌與排組預覽 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            {/* 卡牌庫 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base">
                🃏 系統現有卡牌庫 ({cards?.length || 0})
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {cards?.map(card => (
                  <div key={card.id} className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
                    <div className="h-28 w-full bg-slate-900 relative">
                      <img src={card.image_url} alt={card.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity" />
                      <div className="absolute top-2 left-2 flex gap-1 items-center">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shadow ${
                          card.rarity === 'SSR' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'
                        }`}>{card.rarity}</span>
                        <span className="text-[8px] font-bold bg-slate-900/80 px-1 py-0.5 rounded text-slate-300">{card.element_type.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-white text-xs">{card.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 系統預設排組 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base">
                🛡️ 發布套牌範本 ({decks?.length || 0})
              </h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {decks?.map(deck => {
                  // Find all deck cards in this deck
                  const cardsInDeck = deckCards?.filter(dc => dc.deck_id === deck.id) || [];
                  return (
                    <div key={deck.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm">🛡️ {deck.name}</h4>
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          範本套牌
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {cardsInDeck.map(dc => (
                          <div key={dc.id} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1">
                            <span className="font-bold text-amber-500">{dc.card?.title || '卡牌'}</span>
                            <span className="text-slate-500">x{dc.count}</span>
                          </div>
                        ))}
                        {cardsInDeck.length === 0 && (
                          <p className="text-[10px] text-slate-600">此套牌未配置任何卡牌。</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
  );
}
