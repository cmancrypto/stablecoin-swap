import { useChain } from '@cosmos-kit/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { SwapCard } from '@/components/Swap';
import { defaultChainName, IBCPrefix } from '@/constants';
import { SendAmountAtom, SendAssetAtom, WalletAssetsAtom } from './atoms';
import { truncateString } from './utils';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Asset, ReceiveAmountAtom, ReceiveAssetAtom } from '@/sections';

export const SendSwapCard = () => {
  const [sendAsset, setSendAsset] = useAtom(SendAssetAtom);
  const [sendAmount, setSendAmount] = useAtom(SendAmountAtom);
  const [isSendUpdate, setIsSendUpdate] = useState(false);

  const setReceiveAmount = useSetAtom(ReceiveAmountAtom);
  const receiveAsset = useAtomValue(ReceiveAssetAtom);
  const { exchangeRate } = useExchangeRate();

  const walletAssets = useAtomValue(WalletAssetsAtom);
  const { address } = useChain(defaultChainName);

  // Utility function for handling send and receive updates
  const handleSendReceiveUpdate = (
    sendAsset: Asset | null,
    receiveAsset: Asset | null,
    sendAmount: number,
    setSendAmount: (amount: number) => void,
    setReceiveAmount: (amount: number) => void,
    exchangeRate: number | null,
  ) => {
    if (sendAsset) {
      const amount = parseFloat(sendAsset?.amount || '0');
      const exponent = sendAsset?.exponent || 6;
      const maxAvailable = amount / 10 ** exponent;

      if (sendAsset.denom === receiveAsset?.denom) {
        setReceiveAmount(sendAmount);
      } else {
        if (sendAmount > maxAvailable) {
          setSendAmount(maxAvailable);
          if (exchangeRate) {
            const newReceiveAmount = maxAvailable * exchangeRate;
            setReceiveAmount(newReceiveAmount);
          }
        } else {
          if (sendAmount === 0) {
            setReceiveAmount(0);
          } else if (exchangeRate) {
            const newReceiveAmount = sendAmount * exchangeRate;
            setReceiveAmount(newReceiveAmount);
          }
        }
      }
    }
  };

  // Handle change in send asset (without initial change to amounts)
  const onAssetValueChange = (denom: string) => {
    const asset = walletAssets.find(asset => asset.denom === denom);
    if (asset) {
      setSendAsset(asset);
    }
  };

  // Recalculate the send and receive amounts based on the updated send asset
  useEffect(() => {
    if (sendAsset) {
      handleSendReceiveUpdate(
        sendAsset,
        receiveAsset,
        sendAmount,
        setSendAmount,
        setReceiveAmount,
        exchangeRate,
      );
    }
  }, [sendAsset, sendAmount, exchangeRate, receiveAsset]);

  // Handle change in send amount
  const onAmountValueChange = (value: number) => {
    setIsSendUpdate(true);
    setSendAmount(value ?? 0);
  };

  // Recalculate receive amount when send amount is updated
  useEffect(() => {
    if (isSendUpdate && sendAsset) {
      handleSendReceiveUpdate(
        sendAsset,
        receiveAsset,
        sendAmount,
        setSendAmount,
        setReceiveAmount,
        exchangeRate,
      );
      setIsSendUpdate(false);
    }
  }, [sendAmount, sendAsset, exchangeRate, receiveAsset, walletAssets]);

  return (
    <SwapCard
      title="Send"
      selectPlaceholder="Select asset to send"
      options={walletAssets.reduce(
        (acc, asset) => {
          acc[asset.denom] = {
            value: asset.denom,
            label: truncateString(
              IBCPrefix,
              asset.symbol ? asset.symbol : asset.denom,
            ),
            logo: asset.logo,
          };
          return acc;
        },
        {} as {
          [key: string]: { value: string; label: string; logo?: string };
        },
      )}
      amountValue={sendAmount}
      selectedAsset={sendAsset || null}
      onAssetValueChange={onAssetValueChange}
      onAmountValueChange={onAmountValueChange}
      address={address ?? ''}
      addressInputEnabled={false}
    />
  );
};
