import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

const Aim = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-8 animate-fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">
        <Trans
          i18nKey="aim.title"
          components={[<span className="text-green-400" />]}
        />
      </h2>
    </div>
  );
};

export default Aim;
