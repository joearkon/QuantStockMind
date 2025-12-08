import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const Disclaimer: React.FC = () => {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-700 font-medium">
            风险提示
          </p>
          <p className="text-xs text-amber-600 mt-1">
            本工具生成的分析结果仅供参考，不构成任何投资建议。A股市场波动剧烈，入市需谨慎。
            所引用的数据基于公开信息或AI搜索，可能存在延迟或误差。请务必结合个人风险承受能力独立决策。
          </p>
        </div>
      </div>
    </div>
  );
};
