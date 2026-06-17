// =====================================================================
// 後台「神獸（寵物）配置」分頁（型態/進化線編輯 + 圖片上傳）
//   —— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState, useRef } from 'react';
import { AlertCircle, Sparkles, Trash2, Upload } from 'lucide-react';
import { supabase, isRealSupabase } from '@/lib/supabase';
import { parsePetOffset, trimCenterSquare, useTrimmedPetImage } from '@/lib/petImage';
import { PetLine, PetStage, UserPet, MissionTemplate, Batch } from '@/types';

interface PetsTabProps {
  petLines: PetLine[];
  petStages: PetStage[];
  userPets: UserPet[];
  missionTemplates: MissionTemplate[];
  batches: Batch[];
  isSyncing: boolean;
  onUpdatePetStage?: (stageId: string, updatedFields: Partial<PetStage>) => Promise<void>;
  onUpdatePetLine?: (lineId: string, updatedFields: Partial<PetLine>) => Promise<void>;
  onCreateMissionTemplate?: (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMissionTemplate?: (templateId: string, templateData: Partial<MissionTemplate>) => Promise<void>;
}

export function PetsTab({ petLines, petStages, userPets, missionTemplates, batches, isSyncing, onUpdatePetStage, onUpdatePetLine, onCreateMissionTemplate, onUpdateMissionTemplate }: PetsTabProps) {

  // --- Divine Beast Edit State ---
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editAnimationType, setEditAnimationType] = useState('animate-pulse');
  const [editGlowColor, setEditGlowColor] = useState('#A855F7');
  const [editDescription, setEditDescription] = useState('');
  const [editEvolutionText, setEditEvolutionText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const trimmedEditImage = useTrimmedPetImage(editImageUrl);
  const [editMinLevel, setEditMinLevel] = useState(0);
  const [editMaxLevel, setEditMaxLevel] = useState(99);
  const [editStageActive, setEditStageActive] = useState(true);

  // --- Divine Beast Image Upload State & Handlers ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [bgWarning, setBgWarning] = useState('');

  const checkImageTransparency = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(true);
            return;
          }
          ctx.drawImage(img, 0, 0);
          try {
            const w = img.width;
            const h = img.height;
            const corners = [
              ctx.getImageData(0, 0, 1, 1).data,
              ctx.getImageData(w - 1, 0, 1, 1).data,
              ctx.getImageData(0, h - 1, 1, 1).data,
              ctx.getImageData(w - 1, h - 1, 1, 1).data
            ];
            const hasOpaqueCorner = corners.some(pixel => pixel[3] === 255);
            resolve(!hasOpaqueCorner);
          } catch (e) {
            resolve(true);
          }
        };
        img.onerror = () => resolve(true);
      };
      reader.onerror = () => resolve(true);
    });
  };

  const compressAndConvertToWebP = (file: File): Promise<{ blob: Blob; base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法建立 2D 繪圖環境'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP base64
          const base64 = canvas.toDataURL('image/webp', 0.9);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, base64 });
              } else {
                reject(new Error('圖片壓縮 Blob 轉換失敗'));
              }
            },
            'image/webp',
            0.9
          );
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
      };
      reader.onerror = () => reject(new Error('圖片讀取失敗'));
    });
  };

  const resizeAndKeepPNG = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 512;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法建立 2D 繪圖環境'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed WebP base64 to save localStorage space
          const base64 = canvas.toDataURL('image/webp', 0.8);
          resolve(base64);
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
      };
      reader.onerror = () => reject(new Error('圖片讀取失敗'));
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("selected image:", file);

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('圖片大小不可超過 10MB');
      return;
    }

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('僅支援 PNG、JPG、JPEG 或 WEBP 格式');
      return;
    }

    setUploadError('');
    setBgWarning('');
    setIsUploadingImage(true);

    try {
      // Check transparency warning first
      const isTransparent = await checkImageTransparency(file);
      if (!isTransparent) {
        setBgWarning('此圖片可能不是透明背景，建議先使用去背工具或重新上傳透明 PNG。');
      }

      // 上傳前：裁切主體 + 置中到方形畫布（透明圖才有效，非透明圖則沿用原檔）
      const objUrl = URL.createObjectURL(file);
      const processed = await trimCenterSquare(objUrl);
      URL.revokeObjectURL(objUrl);

      if (isRealSupabase) {
        // Real Supabase Storage Upload
        const uploadBody: Blob = processed || file;
        const fileExt = processed ? 'png' : (file.name.split('.').pop() || 'png');
        const contentType = processed ? 'image/png' : file.type;
        const fileName = `stage-${editingStageId || 'new'}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload file to 'pet-images' bucket
        const { error: uploadError } = await supabase.storage
          .from('pet-images')
          .upload(filePath, uploadBody, {
            contentType,
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('pet-images')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          setEditImageUrl(urlData.publicUrl);
        } else {
          throw new Error('無法取得公開網址');
        }
      } else {
        // Mock Mode: 用裁切置中後的圖（若有），否則沿用原本壓縮
        if (processed) {
          const base64 = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(processed);
          });
          setEditImageUrl(base64);
        } else {
          const pngBase64 = await resizeAndKeepPNG(file);
          setEditImageUrl(pngBase64);
        }
      }
    } catch (err: any) {
      console.error('圖片上傳與壓縮失敗:', err);
      setUploadError(err.message || '圖片上傳與壓縮失敗，請重試');
    } finally {
      setIsUploadingImage(false);
      // Reset input value
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setEditImageUrl('');
    setUploadError('');
    setBgWarning('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Divine Beast Line Edit State ---
  const [petSubTab, setPetSubTab] = useState<'stages' | 'lines' | 'progress'>('stages');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editLineDesc, setEditLineDesc] = useState('');
  const [editLineTraits, setEditLineTraits] = useState('');
  const [editLineActive, setEditLineActive] = useState(true);
  const [editLineUnlockLevel, setEditLineUnlockLevel] = useState(5);
  const [editLineTaskTemplateId, setEditLineTaskTemplateId] = useState<string | null>(null);
  const [editLineSortOrder, setEditLineSortOrder] = useState(1);
  const [progressBatchId, setProgressBatchId] = useState('all');
  const [editLineTaskTitle, setEditLineTaskTitle] = useState('');
  const [editLineTaskDesc, setEditLineTaskDesc] = useState('');
  const [editLineTaskPoints, setEditLineTaskPoints] = useState<number>(500);
  const [editLineTaskReviewType, setEditLineTaskReviewType] = useState<'auto' | 'leader' | 'admin'>('leader');
  const [editLineTaskMaxCompletions, setEditLineTaskMaxCompletions] = useState<number>(1);
  const [editLineTaskActive, setEditLineTaskActive] = useState<boolean>(true);
  const handleSavePetStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStageId || !onUpdatePetStage) return;
    console.log("form image_url before save:", editImageUrl);

    console.log('[PET SAVE] handleSavePetStage saving stage:', {
      stageId: editingStageId,
      stage_name: editStageName,
      animation_type: editAnimationType,
      glow_color: editGlowColor,
      description: editDescription,
      evolution_text: editEvolutionText,
      image_url: editImageUrl,
      min_level: editMinLevel,
      max_level: editMaxLevel,
      is_active: editStageActive
    });
    
    await onUpdatePetStage(editingStageId, {
      stage_name: editStageName,
      animation_type: editAnimationType,
      glow_color: editGlowColor,
      description: editDescription,
      evolution_text: editEvolutionText,
      image_url: editImageUrl,
      min_level: Number(editMinLevel),
      max_level: Number(editMaxLevel),
      is_active: editStageActive
    });
    
    setEditingStageId(null);
    setEditStageName('');
    setEditAnimationType('animate-pulse');
    setEditGlowColor('#A855F7');
    setEditDescription('');
    setEditEvolutionText('');
    setEditImageUrl('');
    setEditMinLevel(0);
    setEditMaxLevel(99);
    setEditStageActive(true);
    setUploadError('');
    setBgWarning('');
  };

  const handleSavePetLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLineId || !onUpdatePetLine) return;
    
    let targetTemplateId = editLineTaskTemplateId;
    if (editLineTaskTemplateId === 'new') {
      if (!editLineTaskTitle.trim()) {
        alert('請輸入新建任務之名稱！');
        return;
      }
      if (onCreateMissionTemplate) {
        try {
          const newTemplate = await onCreateMissionTemplate({
            title: editLineTaskTitle,
            description: editLineTaskDesc,
            mission_type: 'special',
            points: editLineTaskPoints,
            review_type: editLineTaskReviewType,
            is_active: editLineTaskActive,
            category: '神獸進化',
            max_completions: editLineTaskMaxCompletions
          });
          if (newTemplate && newTemplate.id) {
            targetTemplateId = newTemplate.id;
          } else {
            alert('全新任務模板建立未成功返回，請確認！');
            return;
          }
        } catch (err) {
          console.error(err);
          alert('建立修行任務模板失敗！');
          return;
        }
      }
    } else if (editLineTaskTemplateId && onUpdateMissionTemplate) {
      await onUpdateMissionTemplate(editLineTaskTemplateId, {
        title: editLineTaskTitle,
        description: editLineTaskDesc,
        points: editLineTaskPoints,
        review_type: editLineTaskReviewType,
        is_active: editLineTaskActive,
        max_completions: editLineTaskMaxCompletions
      });
    }

    await onUpdatePetLine(editingLineId, {
      name: editLineName,
      description: editLineDesc,
      core_traits: editLineTraits,
      is_active: editLineActive,
      image_url: editImageUrl,
      unlock_level: editLineUnlockLevel,
      task_template_id: targetTemplateId,
      sort_order: editLineSortOrder
    });
    
    setEditingLineId(null);
    setEditLineName('');
    setEditLineDesc('');
    setEditLineTraits('');
    setEditLineActive(true);
    setEditImageUrl('');
    setEditLineUnlockLevel(5);
    setEditLineTaskTemplateId(null);
    setEditLineSortOrder(1);
    setEditLineTaskTitle('');
    setEditLineTaskDesc('');
    setEditLineTaskPoints(500);
    setEditLineTaskReviewType('leader');
    setEditLineTaskMaxCompletions(1);
    setEditLineTaskActive(true);
  };

  return (
        <div className="space-y-6">
          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4 select-none light:border-slate-200">
            <button
              onClick={() => setPetSubTab('stages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                petSubTab === 'stages'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              🐉 神獸階段管理
            </button>
            <button
              onClick={() => setPetSubTab('lines')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                petSubTab === 'lines'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              ✨ 神獸進化路線設定
            </button>
            <button
              onClick={() => setPetSubTab('progress')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                petSubTab === 'progress'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              🎓 學員培育進度
            </button>
          </div>

          {/* ==================== 1. 神獸階段管理 ==================== */}
          {petSubTab === 'stages' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none animate-in fade-in duration-200">
              {/* 編輯神獸階段設定 */}
              <section className={`glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 ${
                editingStageId ? 'md:col-span-3' : 'md:col-span-1'
              }`}>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" />
                  編輯神獸階段設定
                </h3>
                
                {!editingStageId ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-2xl">
                    請從右側列表選擇一個神獸階段<br />以進行客製化設定。
                  </div>
                ) : (
                  <form onSubmit={handleSavePetStage} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Input Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">階段名稱</label>
                        <input
                          required
                          type="text"
                          value={editStageName}
                          onChange={e => setEditStageName(e.target.value)}
                          placeholder="例如：語意烈焰龍 (幼體)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">外觀圖片網址</label>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editImageUrl}
                            onChange={e => setEditImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono text-[11px]"
                          />

                          {/* Image Preview & Operations */}
                          {editImageUrl ? (
                            <div className="flex items-center gap-3 p-3 bg-slate-900/40 border border-white/5 rounded-2xl">
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-950 relative flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={editImageUrl} 
                                  alt="預覽" 
                                  className="w-12 h-12 object-contain"
                                  style={{ filter: `drop-shadow(0 0 8px ${editGlowColor || '#A855F7'})` }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-400 font-bold truncate">目前已設定圖片</p>
                                <button
                                  type="button"
                                  onClick={handleRemoveImage}
                                  className="mt-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-black rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                  移除圖片網址
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-3 border border-dashed border-white/5 rounded-2xl bg-slate-900/10 text-slate-500 text-[10px] font-bold">
                              尚未設定圖片，請輸入網址或從下方上傳。
                            </div>
                          )}

                          {/* Upload Button */}
                          <div>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp"
                              id="beast-image-upload"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={isUploadingImage}
                            />
                            <label
                              htmlFor="beast-image-upload"
                              className={`w-full py-3.5 border border-dashed border-slate-800 hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all select-none ${
                                isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {isUploadingImage ? (
                                <>
                                  <div className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {isRealSupabase ? '圖片上傳中...' : '圖片讀取中...'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Upload size={14} className="text-slate-500" />
                                  <span className="text-[10px] text-slate-400 font-bold">上傳新圖片 (限制 10MB, 支援 PNG/JPG/JPEG/WEBP)</span>
                                </>
                              )}
                            </label>
                            <p className="text-[9px] text-slate-500 font-bold mt-1.5 leading-relaxed">
                              💡 建議上傳：透明背景 PNG / WebP | 尺寸 1024x1024 | 主體置中 | 不要白底 | 不要方框 | 不要卡片背景。
                            </p>
                          </div>

                          {uploadError && (
                            <div className="flex items-center gap-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-bold select-none">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{uploadError}</span>
                            </div>
                          )}

                          {bgWarning && (
                            <div className="flex items-start gap-1.5 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[10px] text-yellow-500 font-bold leading-normal select-none">
                              <AlertCircle size={12} className="shrink-0 mt-0.5" />
                              <span>⚠️ {bgWarning}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 font-bold mb-1">最低等級 (min)</label>
                          <input
                            required
                            type="number"
                            onFocus={(e) => e.target.select()}
                            min={0}
                            max={99}
                            value={editMinLevel}
                            onChange={e => setEditMinLevel(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-bold mb-1">最高等級 (max)</label>
                          <input
                            required
                            type="number"
                            onFocus={(e) => e.target.select()}
                            min={0}
                            max={99}
                            value={editMaxLevel}
                            onChange={e => setEditMaxLevel(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">光環特效顏色 (Hex)</label>
                        <div className="flex gap-2">
                          <input
                            required
                            type="color"
                            value={editGlowColor}
                            onChange={e => setEditGlowColor(e.target.value)}
                            className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-xl outline-none cursor-pointer"
                          />
                          <input
                            required
                            type="text"
                            value={editGlowColor}
                            onChange={e => setEditGlowColor(e.target.value)}
                            placeholder="#A855F7"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono uppercase"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">動畫律動類型</label>
                        <select
                          value={editAnimationType}
                          onChange={e => setEditAnimationType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        >
                          <option value="float">浮空滑行 (float)</option>
                          <option value="bounce">上下彈跳 (bounce)</option>
                          <option value="breath">緩慢膨脹 (breath)</option>
                          <option value="wiggle">輕微擺動 (wiggle)</option>
                          <option value="glow">呼吸光環 (glow)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">神獸敘述</label>
                        <textarea
                          rows={3}
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          placeholder="輸入神獸介紹與屬性加成描述..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">進化提示條件說明</label>
                        <textarea
                          rows={2}
                          value={editEvolutionText}
                          onChange={e => setEditEvolutionText(e.target.value)}
                          placeholder="例如：需達到 LV.5 且於 3 天內破殼..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="editStageActive"
                          checked={editStageActive}
                          onChange={e => setEditStageActive(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                        />
                        <label htmlFor="editStageActive" className="text-xs text-slate-400 font-bold select-none cursor-pointer">
                          啟用此神獸階段
                        </label>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStageId(null);
                            setEditStageName('');
                            setEditImageUrl('');
                            setEditDescription('');
                            setEditEvolutionText('');
                            setEditMinLevel(0);
                            setEditMaxLevel(99);
                            setEditStageActive(true);
                            setUploadError('');
                            setBgWarning('');
                          }}
                          className="flex-1 btn-action py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          disabled={isSyncing}
                          className="flex-1 btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                        >
                          儲存設定
                        </button>
                      </div>
                    </div>

                    {/* Right: Live Preview Panel */}
                    <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-6 light:border-slate-200 relative select-none">
                      {typeof window !== 'undefined' ? (console.log('[PET PREVIEW] Rendering live preview:', {
                        editStageName,
                        editImageUrl,
                        editGlowColor,
                        editAnimationType
                      }), null) : null}
                      <span className="absolute top-0 right-0 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black">
                        LIVE 實時預覽 (LV.30)
                      </span>
                      
                      <div className="mt-4 flex flex-col items-center justify-center">
                        {/* 寵物舞台 */}
                        <div className="relative flex items-center justify-center">
                          <div 
                            className="pet-stage"
                            style={{ 
                              '--glow-color': editGlowColor || '#A855F7',
                            } as React.CSSProperties}
                          >
                            <div className="pet-aura"></div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {editImageUrl ? (
                              <img
                                src={trimmedEditImage || editImageUrl}
                                alt={editStageName || '預覽神獸'}
                                className={`pet-image animate-${editAnimationType || 'float'}`}
                                style={{ 
                                  '--pet-scale': (() => {
                                    let zoom = 1.0; // 預設放大的倍率
                                    if (editImageUrl) {
                                      const match = editImageUrl.match(/[#&?]zoom=([0-9.]+)/i) || editImageUrl.match(/[#&?]scale=([0-9.]+)/i);
                                      if (match && match[1]) {
                                        const parsed = parseFloat(match[1]);
                                        if (!isNaN(parsed) && parsed > 0) zoom = parsed;
                                      }
                                    }
                                    return Math.min(0.85 + (30 % 5) * 0.05, 1.1) * zoom;
                                  })(),
                                  '--pet-x': `${parsePetOffset(editImageUrl).x}px`,
                                  '--pet-y': `${parsePetOffset(editImageUrl).y}px`,
                                  '--glow-color': editGlowColor || '#A855F7'
                                } as React.CSSProperties}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-bold border border-dashed border-white/10 rounded-2xl">
                                暫無圖片
                              </div>
                            )}
                            <div className="pet-shadow"></div>
                            <div className="pet-particles"></div>
                          </div>
                        </div>

                        {/* 寵物文字區 */}
                        <div className="text-center mt-2 flex flex-col items-center w-full px-2">
                          <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">
                            {editStageName || '未命名神獸'}
                          </h4>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full mt-1 inline-block light:bg-slate-100">
                            成長等級：LV.30
                          </span>
                          
                          {/* 說明文字區 */}
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed light:text-slate-500 max-w-xs text-center min-h-[40px]">
                            {editDescription || '尚未輸入神獸敘述描述...'}
                          </p>
                        </div>

                        {/* 偏移量微調 (右側預覽專用) */}
                        <div className="w-full max-w-[240px] mt-6 space-y-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                          <div className="text-center text-[10px] text-slate-400 font-bold mb-2">
                            ✨ 拖曳微調神獸位置與大小
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold w-6 shrink-0">X</span>
                            <input 
                              type="range" 
                              min="-200" max="200" step="1"
                              value={parsePetOffset(editImageUrl).x} 
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                const current = parsePetOffset(editImageUrl);
                                current.x = val;
                                
                                // 保留舊的 zoom 參數
                                let zoomVal = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i);
                                if (match && match[1]) { zoomVal = parseFloat(match[1]); }
                                
                                const cleanUrl = editImageUrl.split('#')[0];
                                setEditImageUrl(`${cleanUrl}#x=${current.x}&y=${current.y}&zoom=${zoomVal}`);
                              }}
                              className="flex-1 accent-red-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-mono w-6 text-right">{parsePetOffset(editImageUrl).x}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold w-6 shrink-0">Y</span>
                            <input 
                              type="range" 
                              min="-200" max="200" step="1"
                              value={parsePetOffset(editImageUrl).y} 
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                const current = parsePetOffset(editImageUrl);
                                current.y = val;

                                // 保留舊的 zoom 參數
                                let zoomVal = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i);
                                if (match && match[1]) { zoomVal = parseFloat(match[1]); }

                                const cleanUrl = editImageUrl.split('#')[0];
                                setEditImageUrl(`${cleanUrl}#x=${current.x}&y=${current.y}&zoom=${zoomVal}`);
                              }}
                              className="flex-1 accent-red-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-mono w-6 text-right">{parsePetOffset(editImageUrl).y}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold w-6 shrink-0">大小</span>
                            <input 
                              type="range" 
                              min="0.5" max="3" step="0.1"
                              value={(() => {
                                let zoom = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i) || editImageUrl?.match(/[#&?]scale=([0-9.]+)/i);
                                if (match && match[1]) { zoom = parseFloat(match[1]); }
                                return zoom;
                              })()}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 1.0;
                                const current = parsePetOffset(editImageUrl);
                                const cleanUrl = editImageUrl.split('#')[0];
                                setEditImageUrl(`${cleanUrl}#x=${current.x}&y=${current.y}&zoom=${val}`);
                              }}
                              className="flex-1 accent-amber-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-mono w-6 text-right">
                              {(() => {
                                let zoom = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i) || editImageUrl?.match(/[#&?]scale=([0-9.]+)/i);
                                if (match && match[1]) { zoom = parseFloat(match[1]); }
                                return zoom.toFixed(1);
                              })()}x
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </section>

              {/* 系統現有神獸階段列表 */}
              <section className={`glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 ${
                editingStageId ? 'md:col-span-3' : 'md:col-span-2'
              }`}>
                <h3 className="font-black text-white text-base">
                  🐉 目前神獸進化階段圖鑑 ({petStages?.length || 0})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
                  {[...(petStages || [])].sort((a, b) => {
                    if (a.line_key !== b.line_key) {
                      return (a.line_key || '').localeCompare(b.line_key || '');
                    }
                    return a.min_level - b.min_level;
                  }).map(stage => {
                    const cleanAnim = (stage.animation_type || '').replace('animate-', '');
                    const isGlow = cleanAnim === 'glow';
                    const glowAnimClass = isGlow ? 'animate-glow-pulse' : `animate-${cleanAnim}`;

                    return (
                      <div key={stage.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex gap-3 light:bg-slate-50 light:border-slate-300">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900 relative flex items-center justify-center">
                          {stage.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={stage.image_url} 
                              alt={stage.stage_name} 
                              className={`w-16 h-16 object-contain ${glowAnimClass}`}
                              style={{ filter: `drop-shadow(0 0 10px ${stage.glow_color || '#A855F7'})` }}
                            />
                          ) : (
                            <div className="text-[10px] text-slate-500 font-bold text-center">無圖片</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-white text-sm">{stage.stage_name}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stage.is_active !== false ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                  {stage.is_active !== false ? '已啟用' : '已停用'}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500">
                                {stage.line_key ? `流派：${stage.line_key === 'dragon' ? '影響力龍系' : stage.line_key === 'lion' ? '行動力獅系' : stage.line_key === 'fox' ? '親和力狐系' : '穩定靈獸系'}` : '通用流派'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Editing stage selected:', stage);
                                setEditingStageId(stage.id);
                                setEditStageName(stage.stage_name || '');
                                setEditImageUrl(stage.image_url || '');
                                setEditGlowColor(stage.glow_color || '#A855F7');
                                const anim = stage.animation_type || 'pulse';
                                const cleanedAnim = anim.startsWith('animate-') ? anim.replace('animate-', '') : anim;
                                setEditAnimationType(cleanedAnim);
                                setEditDescription(stage.description || '');
                                setEditEvolutionText(stage.evolution_text || '');
                                setEditMinLevel(stage.min_level ?? 0);
                                setEditMaxLevel(stage.max_level ?? 99);
                                setEditStageActive(stage.is_active !== false);
                                setUploadError('');
                                setBgWarning('');
                              }}
                              className="btn-action px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-black rounded-lg hover:bg-red-500/20"
                            >
                              編輯設定
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed light:text-slate-600">{stage.description}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500">
                            <span>階段: {stage.stage_index}</span>
                            <span>•</span>
                            <span>等級條件: LV.{stage.min_level ?? 0} ~ LV.{stage.max_level ?? 99}</span>
                            <span>•</span>
                            <span style={{ color: stage.glow_color }}>光環: {stage.glow_color}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ==================== 2. 神獸進化路線設定 ==================== */}
          {petSubTab === 'lines' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none animate-in fade-in duration-200">
              {/* 編輯神獸進化路線設定 */}
              <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-1">
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" />
                  編輯神獸進化路線設定
                </h3>
                
                {!editingLineId ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-2xl">
                    請從右側列表選擇一個神獸進化方向<br />以進行客製化設定。
                  </div>
                ) : (
                  <form onSubmit={handleSavePetLine} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化鍵值 (不可編輯)</label>
                      <input
                        disabled
                        type="text"
                        value={petLines.find(l => l.id === editingLineId)?.line_key || ''}
                        className="w-full bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-xs text-slate-500 outline-none cursor-not-allowed font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化名稱</label>
                      <input
                        required
                        type="text"
                        value={editLineName}
                        onChange={e => setEditLineName(e.target.value)}
                        placeholder="例如：影響力龍系"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                    
                    {/* 進化後神獸圖片 */}
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化後神獸圖片網址 (或從下方上傳)</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          value={editImageUrl}
                          onChange={e => setEditImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      
                      {/* Image Preview & Operations */}
                      {editImageUrl ? (
                        <div className="mt-2 relative w-fit group select-none">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={editImageUrl} 
                            alt="Preview" 
                            className="w-16 h-16 object-contain rounded-xl border border-white/10"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold hover:bg-red-600 shadow"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <label 
                            htmlFor="line-image-upload" 
                            className="btn-action inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/20 select-none cursor-pointer"
                          >
                            <Upload size={12} />
                            {isUploadingImage ? '圖片上傳中...' : '選擇圖片檔案'}
                          </label>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            id="line-image-upload"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isUploadingImage}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">解鎖等級 (預設 Lv.5)</label>
                      <input
                        required
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min={1}
                        max={99}
                        value={editLineUnlockLevel}
                        onChange={e => setEditLineUnlockLevel(parseInt(e.target.value, 10) || 5)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">對應升級任務</label>
                      <select
                        value={editLineTaskTemplateId || ''}
                        onChange={e => {
                          const val = e.target.value || null;
                          setEditLineTaskTemplateId(val);
                          if (val === 'new') {
                            setEditLineTaskTitle('');
                            setEditLineTaskDesc('');
                            setEditLineTaskPoints(500);
                            setEditLineTaskReviewType('leader');
                            setEditLineTaskMaxCompletions(1);
                            setEditLineTaskActive(true);
                          } else if (val) {
                            const matched = missionTemplates.find(t => t.id === val);
                            setEditLineTaskTitle(matched?.title || '');
                            setEditLineTaskDesc(matched?.description || '');
                            setEditLineTaskPoints(matched?.points || 500);
                            setEditLineTaskReviewType(matched?.review_type || 'leader');
                            setEditLineTaskMaxCompletions(matched?.max_completions ?? 1);
                            setEditLineTaskActive(matched?.is_active !== false);
                          } else {
                            setEditLineTaskTitle('');
                            setEditLineTaskDesc('');
                            setEditLineTaskPoints(500);
                            setEditLineTaskReviewType('leader');
                            setEditLineTaskMaxCompletions(1);
                            setEditLineTaskActive(true);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                      >
                        <option value="">-- 請選擇一個任務模板 --</option>
                        <option value="new">➕ 建立並綁定全新修行任務模板</option>
                        {missionTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.title} (+{t.points} EXP)</option>
                        ))}
                      </select>
                    </div>

                    {(editLineTaskTemplateId === 'new' || (editLineTaskTemplateId && missionTemplates.some(t => t.id === editLineTaskTemplateId))) && (
                      <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl space-y-3.5 light:bg-slate-50 light:border-slate-300">
                        <div className="text-[10px] text-red-500 font-black tracking-wider flex items-center gap-1">
                          🛠️ {editLineTaskTemplateId === 'new' ? '建立全新對應修行任務模板' : '編輯此任務模板內容'}
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1">任務名稱</label>
                          <input
                            required
                            type="text"
                            value={editLineTaskTitle}
                            onChange={e => setEditLineTaskTitle(e.target.value)}
                            placeholder="例如：發表一次 NLP 主題感召分享"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1">任務描述/要求</label>
                          <textarea
                            required
                            rows={3}
                            value={editLineTaskDesc}
                            onChange={e => setEditLineTaskDesc(e.target.value)}
                            placeholder="例如：在小組或社群中發表一次..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800 font-medium"
                          />
                        </div>

                        {/* 🛠️ 新增任務規則設定 (積分, 審核, 次數限制, 啟用狀態) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">修行經驗積分</label>
                            <input
                              required
                              type="number"
                              onFocus={(e) => e.target.select()}
                              min={0}
                              value={editLineTaskPoints}
                              onChange={e => setEditLineTaskPoints(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">審核方式設定</label>
                            <select
                              value={editLineTaskReviewType}
                              onChange={e => setEditLineTaskReviewType(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                            >
                              <option value="auto">免審核 (自動核准)</option>
                              <option value="leader">隊長審核</option>
                              <option value="admin">管理員審核</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">最大打卡次數限制</label>
                            <input
                              required
                              type="number"
                              onFocus={(e) => e.target.select()}
                              min={1}
                              value={editLineTaskMaxCompletions}
                              onChange={e => setEditLineTaskMaxCompletions(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input
                              type="checkbox"
                              id="editLineTaskActive"
                              checked={editLineTaskActive}
                              onChange={e => setEditLineTaskActive(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                            />
                            <label htmlFor="editLineTaskActive" className="text-[10px] text-slate-400 font-bold select-none cursor-pointer">
                              啟用此任務模板
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">顯示順序</label>
                      <input
                        required
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min={1}
                        value={editLineSortOrder}
                        onChange={e => setEditLineSortOrder(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">核心特質描述</label>
                      <input
                        required
                        type="text"
                        value={editLineTraits}
                        onChange={e => setEditLineTraits(e.target.value)}
                        placeholder="例如：氣場、引導、說服力"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化路線介紹</label>
                      <textarea
                        rows={3}
                        value={editLineDesc}
                        onChange={e => setEditLineDesc(e.target.value)}
                        placeholder="輸入對應神獸進化方向的成長背景與NLP溝通術流派介紹..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="editLineActive"
                        checked={editLineActive}
                        onChange={e => setEditLineActive(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                      />
                      <label htmlFor="editLineActive" className="text-xs text-slate-400 font-bold select-none cursor-pointer">
                        啟用此進化方向
                      </label>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLineId(null);
                          setEditLineName('');
                          setEditLineTraits('');
                          setEditLineDesc('');
                          setEditLineActive(true);
                          setEditImageUrl('');
                          setEditLineUnlockLevel(5);
                          setEditLineTaskTemplateId(null);
                          setEditLineSortOrder(1);
                          setEditLineTaskTitle('');
                          setEditLineTaskDesc('');
                          setEditLineTaskPoints(500);
                          setEditLineTaskReviewType('leader');
                          setEditLineTaskMaxCompletions(1);
                          setEditLineTaskActive(true);
                        }}
                        className="flex-1 btn-action py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={isSyncing}
                        className="flex-1 btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                      >
                        儲存設定
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* 系統現有神獸進化方向列表 */}
              <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-2">
                <h3 className="font-black text-white text-base">
                  ✨ 目前神獸進化方向列表 ({petLines?.length || 0})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
                  {petLines?.map(line => {
                    const matchedTemplate = missionTemplates.find(t => t.id === line.task_template_id);
                    return (
                      <div key={line.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-3 light:bg-slate-50 light:border-slate-300">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-white text-sm">{line.name}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${line.is_active !== false ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                  {line.is_active !== false ? '已啟用' : '已停用'}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500">
                                鍵值：{line.line_key} | 順序：{line.sort_order || 0}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Editing line selected:', line);
                                setEditingLineId(line.id);
                                setEditLineName(line.name || '');
                                setEditLineTraits(line.core_traits || '');
                                setEditLineDesc(line.description || '');
                                setEditLineActive(line.is_active !== false);
                                setEditImageUrl(line.image_url || '');
                                setEditLineUnlockLevel(line.unlock_level || 5);
                                setEditLineTaskTemplateId(line.task_template_id || null);
                                setEditLineSortOrder(line.sort_order || 1);
                                
                                const matchedTemplate = missionTemplates.find(t => t.id === line.task_template_id);
                                setEditLineTaskTitle(matchedTemplate?.title || '');
                                setEditLineTaskDesc(matchedTemplate?.description || '');
                                setEditLineTaskPoints(matchedTemplate?.points || 500);
                                setEditLineTaskReviewType(matchedTemplate?.review_type || 'leader');
                                setEditLineTaskMaxCompletions(matchedTemplate?.max_completions ?? 1);
                                setEditLineTaskActive(matchedTemplate?.is_active !== false);
                              }}
                              className="btn-action px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-black rounded-lg hover:bg-red-500/20"
                            >
                              編輯設定
                            </button>
                          </div>
                          
                          {/* Evolved Beast Preview */}
                          {line.image_url && (
                            <div className="flex items-center gap-2 bg-slate-900/40 p-2 rounded-xl light:bg-white/40 border border-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={line.image_url} alt={line.name} className="w-8 h-8 object-contain rounded" />
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 font-bold">解鎖等級門檻：Lv.{line.unlock_level || 5}</span>
                                <span className="text-[9px] text-amber-500 truncate max-w-[180px]">任務：{matchedTemplate ? matchedTemplate.title : '未設定'}</span>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 leading-relaxed light:text-slate-600">{line.description}</p>
                        </div>
                        <div className="border-t border-white/5 pt-2 mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500 light:border-slate-200">
                          <span>核心特質:</span>
                          <span className="text-amber-500 font-bold">{line.core_traits || '未設定'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ==================== 3. 學員培育進度 ==================== */}
          {petSubTab === 'progress' && (
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none pb-2 border-b border-white/5 light:border-slate-200">
                <h3 className="font-black text-white text-base">
                  🎓 學員神獸培育進度總覽
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-bold">篩選期數：</label>
                  <select
                    value={progressBatchId}
                    onChange={e => setProgressBatchId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                  >
                    <option value="all">全部期數</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                      <th className="p-3">學員姓名</th>
                      <th className="p-3">當前經驗 (EXP)</th>
                      <th className="p-3">成長等級</th>
                      <th className="p-3">契合流派</th>
                      <th className="p-3">進化型態 / 考驗進度</th>
                      <th className="p-3 text-right">進化判定時間點</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {(() => {
                      const filteredUserPets = userPets?.filter(up => {
                        if (progressBatchId === 'all') return true;
                        return up.profile?.batch_id === progressBatchId;
                      }) || [];

                      if (filteredUserPets.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                              目前該期數尚無學員解鎖或擁有神獸。
                            </td>
                          </tr>
                        );
                      }

                      return filteredUserPets.map(up => {
                        const lineLabel = up.pet_line === 'dragon' ? '影響力龍系' : up.pet_line === 'lion' ? '行動力獅系' : up.pet_line === 'fox' ? '親和力狐系' : up.pet_line === 'spirit' ? '穩定靈獸系' : '無/混沌之卵';
                        const evolved = up.current_stage_index > 1;
                        
                        // Determine evolution status description
                        let evolutionStatusText = '混沌之卵';
                        if (evolved) {
                          evolutionStatusText = `已進化 (${up.stage?.stage_name || '神獸型態'})`;
                        } else if (up.level >= 5) {
                          if (up.selected_evolution_line) {
                            const selectedLine = petLines.find(l => l.line_key === up.selected_evolution_line);
                            const template = selectedLine ? missionTemplates.find(t => t.id === selectedLine.task_template_id) : null;
                            evolutionStatusText = `進化考驗中：${template ? template.title : '未知任務'}`;
                          } else {
                            evolutionStatusText = '可進化 (待學員點選)';
                          }
                        } else {
                          evolutionStatusText = '培育中 (未達 Lv.5)';
                        }

                        return (
                          <tr key={up.id}>
                            <td className="p-3 font-bold text-white">{up.profile?.name || '未知學員'}</td>
                            <td className="p-3 text-amber-500 font-black">{up.profile?.score?.toLocaleString()} EXP</td>
                            <td className="p-3 text-indigo-400 font-black">LV. {up.level || 0}</td>
                            <td className="p-3 font-bold text-slate-300 light:text-slate-800">
                              <span className={up.pet_line ? 'text-pink-400 animate-pulse' : 'text-slate-500'}>{lineLabel}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-200 light:text-slate-800">
                              {evolutionStatusText}
                            </td>
                            <td className="p-3 text-right text-slate-500 font-mono">
                              {up.first_reached_lv5_at ? new Date(up.first_reached_lv5_at).toLocaleString() : '未達 LV.5'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
  );
}
