import React from 'react';

interface StatusBadgeProps {
  status: 'ok' | 'warn' | 'fail' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showText = true,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ok':
        return {
          color: 'bg-green-500',
          text: 'OK',
          textColor: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'warn':
        return {
          color: 'bg-yellow-500',
          text: 'WARN',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        };
      case 'fail':
        return {
          color: 'bg-red-500',
          text: 'FAIL',
          textColor: 'text-red-700',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
      default:
        return {
          color: 'bg-gray-400',
          text: 'UNKNOWN',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          dot: 'w-2 h-2',
          text: 'text-xs',
          padding: 'px-2 py-1'
        };
      case 'lg':
        return {
          dot: 'w-4 h-4',
          text: 'text-sm',
          padding: 'px-3 py-2'
        };
      default:
        return {
          dot: 'w-3 h-3',
          text: 'text-xs',
          padding: 'px-2 py-1'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();

  if (!showText) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`${sizeConfig.dot} ${statusConfig.color} rounded-full`}
          title={statusConfig.text}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        inline-flex items-center space-x-2 rounded-full border
        ${statusConfig.bgColor} ${statusConfig.borderColor} ${sizeConfig.padding}
        ${className}
      `}
    >
      <div className={`${sizeConfig.dot} ${statusConfig.color} rounded-full`} />
      <span className={`font-medium ${statusConfig.textColor} ${sizeConfig.text}`}>
        {statusConfig.text}
      </span>
    </div>
  );
};

export default StatusBadge;