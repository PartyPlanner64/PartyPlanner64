export default [{
      addr: 2147484416, // 0x80000300
      type: "u32",
      name: "osTvType",
      desc: "0=PAL" },
{
      addr: 2147484420, // 0x80000304
      type: "u32",
      name: "osRomType",
      desc: "0=cart" },
{
      addr: 2147484424, // 0x80000308
      type: "data",
      name: "osRomBase",
      desc: "B0000000=cart" },
{
      addr: 2147484428, // 0x8000030C
      type: "data",
      name: "osResetType",
      desc: "0=cold reset" },
{
      addr: 2147484440, // 0x80000318
      type: "data",
      name: "osMemSize",
      desc: "Size of RDRAM" },
{
      addr: 2147523600, // 0x80009C10
      type: "code",
      name: "ReadMainFS",
      desc: "Reads file from MainFS" },
{
      addr: 2147524204, // 0x80009E6C
      type: "code",
      name: "FreeMainFS",
      desc: "Free's an allocated MainFS file pointer" },
{
      addr: 2147529068, // 0x8000B16C
      type: "code",
      name: "GetRandomByte" },
{
      addr: 2147530808, // 0x8000B838
      type: "code",
      name: "LoadGraphics" },
{
      addr: 2147532780, // 0x8000BFEC
      type: "code",
      name: "InitEspriteSlot" },
{
      addr: 2147533188, // 0x8000C184
      type: "code",
      name: "CloseEsprite" },
{
      addr: 2147557920, // 0x80012220
      type: "code",
      name: "InitCameras",
      desc: "A0=num_cameras" },
{
      addr: 2147614240, // 0x8001FE20
      type: "code",
      name: "InitAnimations",
      desc: "A0=1" },
{
      addr: 2147702884, // 0x80035864
      type: "code",
      name: "MallocPerm",
      desc: "A0=size" },
{
      addr: 2147774816, // 0x80047160
      type: "code",
      name: "InitObjSys" },
{
      addr: 2147778208, // 0x80047EA0
      type: "code",
      name: "InitProcess" },
{
      addr: 2147778568, // 0x80048008
      type: "code",
      name: "EndProcess" },
{
      addr: 2147778856, // 0x80048128
      type: "code",
      name: "LoadOverlay",
      desc: "A0=num" },
{
      addr: 2147788064, // 0x8004A520
      type: "code",
      name: "PlayMusic",
      desc: "A0=index" },
{
      addr: 2147789448, // 0x8004AA88
      type: "code",
      name: "PlaySound",
      desc: "A0=index" },
{
      addr: 2147802492, // 0x8004DD7C
      type: "code",
      name: "DrawDebugText",
      desc: "A0=x_pos" },
{
      addr: 2147807248, // 0x8004F010
      type: "code",
      name: "SleepProcess" },
{
      addr: 2147807348, // 0x8004F074
      type: "code",
      name: "SleepVProcess",
      desc: "Sleep 1 frame" },
{
      addr: 2147808676, // 0x8004F5A4
      type: "code",
      name: "SaveFileEncode",
      desc: "A0=start addr of data to encode" },
{
      addr: 2147809868, // 0x8004FA4C
      type: "code",
      name: "SaveFileDecode",
      desc: "A0=start addr of portion to decode" },
{
      addr: 2147833456, // 0x80055670
      type: "code",
      name: "FreeGraphics" },
{
      addr: 2147833872, // 0x80055810
      type: "code",
      name: "ImgPackParse" },
{
      addr: 2147877132, // 0x8006010C
      type: "code",
      name: "DisablePromptOption",
      desc: "A0=window_id" },
{
      addr: 2147885032, // 0x80061FE8
      type: "code",
      name: "InitFadeIn",
      desc: "A0=fade_type" },
{
      addr: 2147885136, // 0x80062050
      type: "code",
      name: "InitFadeOut",
      desc: "A0=fade_type" },
{
      addr: 2147885244, // 0x800620BC
      type: "code",
      name: "GetFadeStatus",
      desc: "returns 0 when fade action is finished" },
{
      addr: 2147902720, // 0x80066500
      type: "code",
      name: "setjmp" },
{
      addr: 2147902820, // 0x80066564
      type: "code",
      name: "longjmp" },
{
      addr: 2147930096, // 0x8006CFF0
      type: "code",
      name: "alSeqpGetChlVol" },
{
      addr: 2147930128, // 0x8006D010
      type: "code",
      name: "alSeqpGetChlFXMix" },
{
      addr: 2147930160, // 0x8006D030
      type: "code",
      name: "alSeqpGetChlPan" },
{
      addr: 2147930192, // 0x8006D050
      type: "code",
      name: "alSeqpGetChlProgram" },
{
      addr: 2147930320, // 0x8006D0D0
      type: "code",
      name: "alSeqpGetState" },
{
      addr: 2147930336, // 0x8006D0E0
      type: "code",
      name: "alCSPGetTempo" },
{
      addr: 2147930384, // 0x8006D110
      type: "code",
      name: "alSeqpPlay" },
{
      addr: 2147930432, // 0x8006D140
      type: "code",
      name: "alSeqpSetBank" },
{
      addr: 2147930480, // 0x8006D170
      type: "code",
      name: "alSeqpSetSeq" },
{
      addr: 2147930528, // 0x8006D1A0
      type: "code",
      name: "alSeqpSetTempo" },
{
      addr: 2147930608, // 0x8006D1F0
      type: "code",
      name: "alSeqpSetVol" },
{
      addr: 2147930656, // 0x8006D220
      type: "code",
      name: "alSeqpStop" },
{
      addr: 2147933812, // 0x8006DE74
      type: "code",
      name: "alEvtqPostEvent" },
{
      addr: 2147950624, // 0x80072020
      type: "code",
      name: "osEepromWrite" },
{
      addr: 2147951228, // 0x8007227C
      type: "code",
      name: "__osEepStatus" },
{
      addr: 2147951776, // 0x800724A0
      type: "code",
      name: "osEepromLongWrite" },
{
      addr: 2147952016, // 0x80072590
      type: "code",
      name: "osEepromLongRead" },
{
      addr: 2147952128, // 0x80072600
      type: "code",
      name: "osSetIntMask" },
{
      addr: 2147952288, // 0x800726A0
      type: "code",
      name: "osCreatePiManager" },
{
      addr: 2147952748, // 0x8007286C
      type: "code",
      name: "__Dom2SpeedParam" },
{
      addr: 2147952756, // 0x80072874
      type: "code",
      name: "__osPiTable" },
{
      addr: 2147952760, // 0x80072878
      type: "code",
      name: "__osPiDevMgr" },
{
      addr: 2147952864, // 0x800728E0
      type: "code",
      name: "__Dom1SpeedParam" },
{
      addr: 2147952976, // 0x80072950
      type: "code",
      name: "__osEPiRawStartDma" },
{
      addr: 2147952980, // 0x80072954
      type: "code",
      name: "__osCurrentHandle" },
{
      addr: 2147952988, // 0x8007295C
      type: "code",
      name: "__osPiTable" },
{
      addr: 2147952992, // 0x80072960
      type: "code",
      name: "__osPiDevMgr" },
{
      addr: 2147953472, // 0x80072B40
      type: "code",
      name: "osEPiStartDma" },
{
      addr: 2147953632, // 0x80072BE0
      type: "code",
      name: "__CartRomHandle" },
{
      addr: 2147953748, // 0x80072C54
      type: "code",
      name: "osCartRomInit" },
{
      addr: 2147954016, // 0x80072D60
      type: "code",
      name: "__osDevMgrMain" },
{
      addr: 2147954976, // 0x80073120
      type: "code",
      name: "__osPiRelAccess" },
{
      addr: 2147955016, // 0x80073148
      type: "code",
      name: "__osPiGetAccess" },
{
      addr: 2147955060, // 0x80073174
      type: "code",
      name: "__osPiGetAccess" },
{
      addr: 2147955124, // 0x800731B4
      type: "code",
      name: "__osPiAccessQueue" },
{
      addr: 2147955148, // 0x800731CC
      type: "code",
      name: "__osPiCreateAccessQueue" },
{
      addr: 2147955168, // 0x800731E0
      type: "code",
      name: "__osPiRelAccess" },
{
      addr: 2147955216, // 0x80073210
      type: "code",
      name: "osAiGetLength" },
{
      addr: 2147955232, // 0x80073220
      type: "code",
      name: "__osPiAccessQueueEnabled" },
{
      addr: 2147955680, // 0x800733E0
      type: "code",
      name: "_init_lpfilter" },
{
      addr: 2147955844, // 0x80073484
      type: "code",
      name: "alFxNew" },
{
      addr: 2147957020, // 0x8007391C
      type: "code",
      name: "alEnvmixerNew" },
{
      addr: 2147957204, // 0x800739D4
      type: "code",
      name: "alLoadNew" },
{
      addr: 2147957380, // 0x80073A84
      type: "code",
      name: "alResampleNew" },
{
      addr: 2147957520, // 0x80073B10
      type: "code",
      name: "alAuxBusNew" },
{
      addr: 2147957612, // 0x80073B6C
      type: "code",
      name: "alMainBusNew" },
{
      addr: 2147957704, // 0x80073BC8
      type: "code",
      name: "alSaveNew" },
{
      addr: 2147957776, // 0x80073C10
      type: "code",
      name: "alLoadParam" },
{
      addr: 2147958204, // 0x80073DBC
      type: "code",
      name: "alRaw16Pull" },
{
      addr: 2147959128, // 0x80074158
      type: "code",
      name: "alAdpcmPull" },
{
      addr: 2147959792, // 0x800743F0
      type: "code",
      name: "alLoadParam" },
{
      addr: 2147960220, // 0x8007459C
      type: "code",
      name: "__load_o_0108" },
{
      addr: 2147960608, // 0x80074720
      type: "code",
      name: "alAuxBusParam" },
{
      addr: 2147960656, // 0x80074750
      type: "code",
      name: "alAuxBusPull" },
{
      addr: 2147960828, // 0x800747FC
      type: "code",
      name: "alAuxBusParam" },
{
      addr: 2147960880, // 0x80074830
      type: "code",
      name: "alBnkfNew" },
{
      addr: 2147961028, // 0x800748C4
      type: "code",
      name: "alSeqFileNew" },
{
      addr: 2147961092, // 0x80074904
      type: "code",
      name: "__bnkf_o_0098" },
{
      addr: 2147961264, // 0x800749B0
      type: "code",
      name: "__bnkf_o_0118" },
{
      addr: 2147961412, // 0x80074A44
      type: "code",
      name: "__bnkf_o_01D8" },
{
      addr: 2147961500, // 0x80074A9C
      type: "code",
      name: "__bnkf_o_0258" },
{
      addr: 2147961600, // 0x80074B00
      type: "code",
      name: "_ldexpf" },
{
      addr: 2147961636, // 0x80074B24
      type: "code",
      name: "_frexpf" },
{
      addr: 2147961860, // 0x80074C04
      type: "code",
      name: "alEnvmixerParam" },
{
      addr: 2147962072, // 0x80074CD8
      type: "code",
      name: "alEnvmixerPull" },
{
      addr: 2147962880, // 0x80075000
      type: "code",
      name: "alEnvmixerParam" },
{
      addr: 2147963092, // 0x800750D4
      type: "code",
      name: "__env_o_01E0" },
{
      addr: 2147964076, // 0x800754AC
      type: "code",
      name: "__env_o_0718" },
{
      addr: 2147964716, // 0x8007572C
      type: "code",
      name: "__env_o_027C" },
{
      addr: 2147964848, // 0x800757B0
      type: "code",
      name: "alEvtqFlushType" },
{
      addr: 2147965024, // 0x80075860
      type: "code",
      name: "alEvtqFlush" },
{
      addr: 2147965144, // 0x800758D8
      type: "code",
      name: "alEvtqPostEvent" },
{
      addr: 2147965412, // 0x800759E4
      type: "code",
      name: "alEvtqNextEvent" },
{
      addr: 2147965564, // 0x80075A7C
      type: "code",
      name: "alEvtqNew" },
{
      addr: 2147965696, // 0x80075B00
      type: "code",
      name: "alFilterNew" },
{
      addr: 2147965728, // 0x80075B20
      type: "code",
      name: "alMainBusParam" },
{
      addr: 2147965776, // 0x80075B50
      type: "code",
      name: "alMainBusPull" },
{
      addr: 2147966048, // 0x80075C60
      type: "code",
      name: "alMainBusParam" },
{
      addr: 2147966096, // 0x80075C90
      type: "code",
      name: "alResampleParam" },
{
      addr: 2147966288, // 0x80075D50
      type: "code",
      name: "alResamplePull" },
{
      addr: 2147966588, // 0x80075E7C
      type: "code",
      name: "alResampleParam" },
{
      addr: 2147971580, // 0x800771FC
      type: "code",
      name: "alLink" },
{
      addr: 2147971612, // 0x8007721C
      type: "code",
      name: "alUnlink" },
{
      addr: 2147971664, // 0x80077250
      type: "code",
      name: "alHeapInit" },
{
      addr: 2147971728, // 0x80077290
      type: "code",
      name: "alHeapDBAlloc" },
{
      addr: 2147971808, // 0x800772E0
      type: "code",
      name: "alCopy" },
{
      addr: 2147971872, // 0x80077320
      type: "code",
      name: "alCSeqGetLoc" },
{
      addr: 2147971988, // 0x80077394
      type: "code",
      name: "alCSeqSetLoc" },
{
      addr: 2147972104, // 0x80077408
      type: "code",
      name: "alCSeqNewMarker" },
{
      addr: 2147972384, // 0x80077520
      type: "code",
      name: "__alCSeqNextDelta" },
{
      addr: 2147972512, // 0x800775A0
      type: "code",
      name: "__cseq_o_0194" },
{
      addr: 2147972768, // 0x800776A0
      type: "code",
      name: "alCSeqGetTicks" },
{
      addr: 2147972776, // 0x800776A8
      type: "code",
      name: "alCSeqSecToTicks" },
{
      addr: 2147972936, // 0x80077748
      type: "code",
      name: "alCSeqTicksToSec" },
{
      addr: 2147973060, // 0x800777C4
      type: "code",
      name: "__alCSeqNextDelta" },
{
      addr: 2147973188, // 0x80077844
      type: "code",
      name: "alCSeqNextEvent" },
{
      addr: 2147973432, // 0x80077938
      type: "code",
      name: "alCSeqNew" },
{
      addr: 2147974324, // 0x80077CB4
      type: "code",
      name: "__cseq_o_02A4" },
{
      addr: 2147974508, // 0x80077D6C
      type: "code",
      name: "__cseq_o_0088" },
{
      addr: 2147974916, // 0x80077F04
      type: "code",
      name: "alAudioFrame" },
{
      addr: 2147975348, // 0x800780B4
      type: "code",
      name: "alSynNew" },
{
      addr: 2147975840, // 0x800782A0
      type: "code",
      name: "__synthesizer_o_0440" },
{
      addr: 2147975988, // 0x80078334
      type: "code",
      name: "__synthesizer_o_0370" },
{
      addr: 2147976136, // 0x800783C8
      type: "code",
      name: "__synthesizer_o_032C" },
{
      addr: 2147976224, // 0x80078420
      type: "code",
      name: "alSynDelete" },
{
      addr: 2147976240, // 0x80078430
      type: "code",
      name: "alSynAddPlayer" },
{
      addr: 2147976320, // 0x80078480
      type: "code",
      name: "alSynFreeVoice" },
{
      addr: 2147976664, // 0x800785D8
      type: "code",
      name: "alSynAllocVoice" },
{
      addr: 2147976776, // 0x80078648
      type: "code",
      name: "__synallocvoice_o_0048" },
{
      addr: 2147976960, // 0x80078700
      type: "code",
      name: "alSynStopVoice" },
{
      addr: 2147977088, // 0x80078780
      type: "code",
      name: "alSynStartVoice" },
{
      addr: 2147977248, // 0x80078820
      type: "code",
      name: "alSynSetPitch" },
{
      addr: 2147977392, // 0x800788B0
      type: "code",
      name: "alSynSetVol" },
{
      addr: 2147977584, // 0x80078970
      type: "code",
      name: "alSynSetFXMix" },
{
      addr: 2147977744, // 0x80078A10
      type: "code",
      name: "alSynSetPan" },
{
      addr: 2147977888, // 0x80078AA0
      type: "code",
      name: "alSynAllocFX" },
{
      addr: 2147978048, // 0x80078B40
      type: "code",
      name: "alCents2Ratio" },
{
      addr: 2147978144, // 0x80078BA0
      type: "code",
      name: "osInvalDCache" },
{
      addr: 2147978320, // 0x80078C50
      type: "code",
      name: "osInvalICache" },
{
      addr: 2147978448, // 0x80078CD0
      type: "code",
      name: "osWritebackDCache" },
{
      addr: 2147978624, // 0x80078D80
      type: "code",
      name: "osContGetReadData" },
{
      addr: 2147978780, // 0x80078E1C
      type: "code",
      name: "osContStartReadData" },
{
      addr: 2147978916, // 0x80078EA4
      type: "code",
      name: "__contreaddata_o_0028" },
{
      addr: 2147979984, // 0x800792D0
      type: "code",
      name: "osVirtualToPhysical" },
{
      addr: 2147980080, // 0x80079330
      type: "code",
      name: "cosf" },
{
      addr: 2147980416, // 0x80079480
      type: "code",
      name: "guLookAt" },
{
      addr: 2147981316, // 0x80079804
      type: "code",
      name: "guLookAtF" },
{
      addr: 2147982224, // 0x80079B90
      type: "code",
      name: "guLookAtHilite" },
{
      addr: 2147982436, // 0x80079C64
      type: "code",
      name: "guLookAtHiliteF" },
{
      addr: 2147984880, // 0x8007A5F0
      type: "code",
      name: "guLookAtReflect" },
{
      addr: 2147984988, // 0x8007A65C
      type: "code",
      name: "guLookAtReflectF" },
{
      addr: 2147986400, // 0x8007ABE0
      type: "code",
      name: "guOrtho" },
{
      addr: 2147986732, // 0x8007AD2C
      type: "code",
      name: "guOrthoF" },
{
      addr: 2147987040, // 0x8007AE60
      type: "code",
      name: "guPerspective" },
{
      addr: 2147987496, // 0x8007B028
      type: "code",
      name: "guPerspectiveF" },
{
      addr: 2147987936, // 0x8007B1E0
      type: "code",
      name: "guRandom" },
{
      addr: 2147987984, // 0x8007B210
      type: "code",
      name: "guRotateRPY" },
{
      addr: 2147988380, // 0x8007B39C
      type: "code",
      name: "guRotateRPYF" },
{
      addr: 2147988784, // 0x8007B530
      type: "code",
      name: "sinf" },
{
      addr: 2147989200, // 0x8007B6D0
      type: "code",
      name: "__osRdbSend" },
{
      addr: 2147989736, // 0x8007B8E8
      type: "code",
      name: "__osRdb_IP6_Empty" },
{
      addr: 2147989744, // 0x8007B8F0
      type: "code",
      name: "__osRdb_IP6_CurSend" },
{
      addr: 2147989748, // 0x8007B8F4
      type: "code",
      name: "__osRdb_IP6_CurWrite" },
{
      addr: 2147989752, // 0x8007B8F8
      type: "code",
      name: "__osRdb_IP6_Ct" },
{
      addr: 2147989756, // 0x8007B8FC
      type: "code",
      name: "__osRdb_IP6_Size" },
{
      addr: 2147989760, // 0x8007B900
      type: "code",
      name: "__osRdb_IP6_Data" },
{
      addr: 2147989764, // 0x8007B904
      type: "code",
      name: "osInitRdb" },
{
      addr: 2147989872, // 0x8007B970
      type: "code",
      name: "bcopy" },
{
      addr: 2147990672, // 0x8007BC90
      type: "code",
      name: "bzero" },
{
      addr: 2147990832, // 0x8007BD30
      type: "code",
      name: "memcpy" },
{
      addr: 2147990896, // 0x8007BD70
      type: "code",
      name: "strlen" },
{
      addr: 2147990976, // 0x8007BDC0
      type: "code",
      name: "sprintf" },
{
      addr: 2147991120, // 0x8007BE50
      type: "code",
      name: "rmonPrintf",
      desc: "disabled behind flag" },
{
      addr: 2147991168, // 0x8007BE80
      type: "code",
      name: "osSyncPrintf",
      desc: "disabled behind flag" },
{
      addr: 2147991296, // 0x8007BF00
      type: "code",
      name: "osCreateMesgQueue" },
{
      addr: 2147991344, // 0x8007BF30
      type: "code",
      name: "osJamMesg" },
{
      addr: 2147991664, // 0x8007C070
      type: "code",
      name: "osRecvMesg" },
{
      addr: 2147991968, // 0x8007C1A0
      type: "code",
      name: "osSendMesg" },
{
      addr: 2147992272, // 0x8007C2D0
      type: "code",
      name: "__osEventStateTab" },
{
      addr: 2147992392, // 0x8007C348
      type: "code",
      name: "osSetEventMesg" },
{
      addr: 2147992456, // 0x8007C388
      type: "code",
      name: "osSetEventMesg" },
{
      addr: 2147992512, // 0x8007C3C0
      type: "code",
      name: "osSpTaskStartGo" },
{
      addr: 2147992556, // 0x8007C3EC
      type: "code",
      name: "osSpTaskLoad" },
{
      addr: 2147993088, // 0x8007C600
      type: "code",
      name: "osSpTaskYield" },
{
      addr: 2147993120, // 0x8007C620
      type: "code",
      name: "osSpTaskYielded" },
{
      addr: 2147993200, // 0x8007C670
      type: "code",
      name: "__osSiRawStartDma" },
{
      addr: 2147993460, // 0x8007C774
      type: "code",
      name: "__osSiGetAccess" },
{
      addr: 2147993568, // 0x8007C7E0
      type: "code",
      name: "__osSiRelAccess" },
{
      addr: 2147993616, // 0x8007C810
      type: "code",
      name: "osCreateThread" },
{
      addr: 2147994096, // 0x8007C9F0
      type: "code",
      name: "osGetThreadPri" },
{
      addr: 2147994128, // 0x8007CA10
      type: "code",
      name: "osSetThreadPri" },
{
      addr: 2147994336, // 0x8007CAE0
      type: "code",
      name: "osStartThread" },
{
      addr: 2147994624, // 0x8007CC00
      type: "code",
      name: "__osDequeueThread" },
{
      addr: 2147994676, // 0x8007CC34
      type: "code",
      name: "__osFaultedThread" },
{
      addr: 2147994680, // 0x8007CC38
      type: "code",
      name: "__osRunningThread" },
{
      addr: 2147994684, // 0x8007CC3C
      type: "code",
      name: "__osActiveQueue" },
{
      addr: 2147994688, // 0x8007CC40
      type: "code",
      name: "osYieldThread" },
{
      addr: 2147994692, // 0x8007CC44
      type: "code",
      name: "__osThreadTail" },
{
      addr: 2147994768, // 0x8007CC90
      type: "code",
      name: "osGetTime" },
{
      addr: 2147994912, // 0x8007CD20
      type: "code",
      name: "osSetTimer" },
{
      addr: 2147995784, // 0x8007D088
      type: "code",
      name: "__osSetTimerIntr" },
{
      addr: 2147995912, // 0x8007D108
      type: "code",
      name: "__osInsertTimer" },
{
      addr: 2147996176, // 0x8007D210
      type: "code",
      name: "__osProbeTLB" },
{
      addr: 2147996368, // 0x8007D2D0
      type: "code",
      name: "osViGetCurrentFramebuffer" },
{
      addr: 2147997328, // 0x8007D690
      type: "code",
      name: "osViSetEvent" },
{
      addr: 2147997424, // 0x8007D6F0
      type: "code",
      name: "osViSetMode" },
{
      addr: 2147997504, // 0x8007D740
      type: "code",
      name: "osViSetSpecialFeatures" },
{
      addr: 2147997872, // 0x8007D8B0
      type: "code",
      name: "osViSetYScale" },
{
      addr: 2147997952, // 0x8007D900
      type: "code",
      name: "osViSwapBuffer" },
{
      addr: 2147998032, // 0x8007D950
      type: "code",
      name: "__osViSwapContext" },
{
      addr: 2147998816, // 0x8007DC60
      type: "code",
      name: "osViBlack" },
{
      addr: 2147998912, // 0x8007DCC0
      type: "code",
      name: "guMtxIdentF" },
{
      addr: 2147999008, // 0x8007DD20
      type: "code",
      name: "guMtxF2L" },
{
      addr: 2147999136, // 0x8007DDA0
      type: "code",
      name: "guMtxL2F" },
{
      addr: 2147999264, // 0x8007DE20
      type: "code",
      name: "guMtxCatF" },
{
      addr: 2147999808, // 0x8007E040
      type: "code",
      name: "guMtxCatL" },
{
      addr: 2147999936, // 0x8007E0C0
      type: "code",
      name: "guRotate" },
{
      addr: 2148000312, // 0x8007E238
      type: "code",
      name: "guRotateF" },
{
      addr: 2148000672, // 0x8007E3A0
      type: "code",
      name: "osMotorInit" },
{
      addr: 2148001256, // 0x8007E5E8
      type: "code",
      name: "__osMotorAccess" },
{
      addr: 2148001584, // 0x8007E730
      type: "code",
      name: "__osPfsSelectBank" },
{
      addr: 2148001696, // 0x8007E7A0
      type: "code",
      name: "__osContRamRead" },
{
      addr: 2148002184, // 0x8007E988
      type: "code",
      name: "__osPfsLastChannel" },
{
      addr: 2148002192, // 0x8007E990
      type: "code",
      name: "__osContRamWrite" },
{
      addr: 2148002816, // 0x8007EC00
      type: "code",
      name: "osAfterPreNMI" },
{
      addr: 2148002848, // 0x8007EC20
      type: "code",
      name: "osGetMemSize" },
{
      addr: 2148004048, // 0x8007F0D0
      type: "code",
      name: "__checkHardware_kmc" },
{
      addr: 2148004108, // 0x8007F10C
      type: "code",
      name: "__osInitialize_kmc" },
{
      addr: 2148005024, // 0x8007F4A0
      type: "code",
      name: "__checkHardware_msp" },
{
      addr: 2148005072, // 0x8007F4D0
      type: "code",
      name: "__osInitialize_msp" },
{
      addr: 2148005984, // 0x8007F860
      type: "code",
      name: "__osInitialize_emu" },
{
      addr: 2148006112, // 0x8007F8E0
      type: "code",
      name: "__osEepromRead16K" },
{
      addr: 2148006116, // 0x8007F8E4
      type: "code",
      name: "__osEepPifRam" },
{
      addr: 2148006180, // 0x8007F924
      type: "code",
      name: "osEepromRead" },
{
      addr: 2148006536, // 0x8007FA88
      type: "code",
      name: "__conteepread_o_00B8" },
{
      addr: 2148009500, // 0x8008061C
      type: "code",
      name: "__osEnqueueAndYield" },
{
      addr: 2148009844, // 0x80080774
      type: "code",
      name: "__osPopThread" },
{
      addr: 2148010304, // 0x80080940
      type: "code",
      name: "__osDisableInt" },
{
      addr: 2148010416, // 0x800809B0
      type: "code",
      name: "__osRestoreInt" },
{
      addr: 2148010448, // 0x800809D0
      type: "code",
      name: "__osSetGlobalIntMask" },
{
      addr: 2148010512, // 0x80080A10
      type: "code",
      name: "__osResetGlobalIntMask" },
{
      addr: 2148010592, // 0x80080A60
      type: "code",
      name: "__osPiRawStartDma" },
{
      addr: 2148010800, // 0x80080B30
      type: "code",
      name: "osPiGetCmdQueue" },
{
      addr: 2148010832, // 0x80080B50
      type: "code",
      name: "__osEPiRawReadIo" },
{
      addr: 2148011184, // 0x80080CB0
      type: "code",
      name: "alHeapCheck" },
{
      addr: 2148011200, // 0x80080CC0
      type: "code",
      name: "__osEPiRawWriteIo" },
{
      addr: 2148011568, // 0x80080E30
      type: "code",
      name: "osPiWriteIo" },
{
      addr: 2148011648, // 0x80080E80
      type: "code",
      name: "osPiReadIo" },
{
      addr: 2148011728, // 0x80080ED0
      type: "code",
      name: "__osAiDeviceBusy" },
{
      addr: 2148011760, // 0x80080EF0
      type: "code",
      name: "__osThreadSave" },
{
      addr: 2148012464, // 0x800811B0
      type: "code",
      name: "__osThprofStack" },
{
      addr: 2148012468, // 0x800811B4
      type: "code",
      name: "__osThprofHeap" },
{
      addr: 2148012608, // 0x80081240
      type: "code",
      name: "sqrtf" },
{
      addr: 2148012624, // 0x80081250
      type: "code",
      name: "__osRdb_Read_Data_Ct" },
{
      addr: 2148012628, // 0x80081254
      type: "code",
      name: "__osRdb_Read_Data_Buf" },
{
      addr: 2148012632, // 0x80081258
      type: "code",
      name: "osReadHost" },
{
      addr: 2148014272, // 0x800818C0
      type: "code",
      name: "MonitorInitBreak" },
{
      addr: 2148014304, // 0x800818E0
      type: "code",
      name: "__isExp" },
{
      addr: 2148014628, // 0x80081A24
      type: "code",
      name: "__isExpJP" },
{
      addr: 2148015540, // 0x80081DB4
      type: "code",
      name: "__osThprofCount" },
{
      addr: 2148015544, // 0x80081DB8
      type: "code",
      name: "__osThprofLastTimer" },
{
      addr: 2148015548, // 0x80081DBC
      type: "code",
      name: "osThreadProfileCallback" },
{
      addr: 2148015680, // 0x80081E40
      type: "code",
      name: "__osThprofFunc" },
{
      addr: 2148015684, // 0x80081E44
      type: "code",
      name: "__osThprofFlag" },
{
      addr: 2148017296, // 0x80082490
      type: "code",
      name: "__osGetCause" },
{
      addr: 2148017312, // 0x800824A0
      type: "code",
      name: "osGetCount" },
{
      addr: 2148017376, // 0x800824E0
      type: "code",
      name: "__rmonSendFault" },
{
      addr: 2148017380, // 0x800824E4
      type: "code",
      name: "rmonRdbReadBuf" },
{
      addr: 2148017808, // 0x80082690
      type: "code",
      name: "__osSpDeviceBusy" },
{
      addr: 2148017840, // 0x800826B0
      type: "code",
      name: "__osSpGetStatus" },
{
      addr: 2148017856, // 0x800826C0
      type: "code",
      name: "__osSpSetStatus" },
{
      addr: 2148017872, // 0x800826D0
      type: "code",
      name: "__osSpSetPc" },
{
      addr: 2148017920, // 0x80082700
      type: "code",
      name: "__osSpRawStartDma" },
{
      addr: 2148018064, // 0x80082790
      type: "code",
      name: "__osSpRawReadIo" },
{
      addr: 2148018144, // 0x800827E0
      type: "code",
      name: "__osSpRawWriteIo" },
{
      addr: 2148018224, // 0x80082830
      type: "code",
      name: "__osContDataCrc" },
{
      addr: 2148018332, // 0x8008289C
      type: "code",
      name: "__osContDataCrc" },
{
      addr: 2148018348, // 0x800828AC
      type: "code",
      name: "__osContAddressCrc" },
{
      addr: 2148019040, // 0x80082B60
      type: "code",
      name: "__osPfsGetInitData" },
{
      addr: 2148019220, // 0x80082C14
      type: "code",
      name: "__osPfsRequestData" },
{
      addr: 2148019384, // 0x80082CB8
      type: "code",
      name: "__osPfsPifRam" },
{
      addr: 2148019420, // 0x80082CDC
      type: "code",
      name: "__pfsisplug_o_004C" },
{
      addr: 2148019428, // 0x80082CE4
      type: "code",
      name: "__rmonIOhandler" },
{
      addr: 2148019448, // 0x80082CF8
      type: "code",
      name: "osPfsIsPlug" },
{
      addr: 2148019584, // 0x80082D80
      type: "code",
      name: "__pfsisplug_o_0094" },
{
      addr: 2148019604, // 0x80082D94
      type: "code",
      name: "__rmonIOputw" },
{
      addr: 2148019696, // 0x80082DF0
      type: "code",
      name: "__rmonIOflush" },
{
      addr: 2148019756, // 0x80082E2C
      type: "code",
      name: "__rmonSendFault" },
{
      addr: 2148019776, // 0x80082E40
      type: "code",
      name: "__osPfsGetOneChannelData" },
{
      addr: 2148019904, // 0x80082EC0
      type: "code",
      name: "__osPfsRequestOneChannel" },
{
      addr: 2148020016, // 0x80082F30
      type: "code",
      name: "__pfsgetstatus_o_0030" },
{
      addr: 2148020052, // 0x80082F54
      type: "code",
      name: "__osPfsGetStatus" },
{
      addr: 2148020164, // 0x80082FC4
      type: "code",
      name: "__pfsgetstatus_o_0084" },
{
      addr: 2148020304, // 0x80083050
      type: "code",
      name: "__osPfsInodeCache" },
{
      addr: 2148020424, // 0x800830C8
      type: "code",
      name: "__contpfs_o_0598" },
{
      addr: 2148020560, // 0x80083150
      type: "code",
      name: "__osPfsRWInode" },
{
      addr: 2148021172, // 0x800833B4
      type: "code",
      name: "__contpfs_o_0578" },
{
      addr: 2148021384, // 0x80083488
      type: "code",
      name: "__osCheckId" },
{
      addr: 2148021568, // 0x80083540
      type: "code",
      name: "__osGetId" },
{
      addr: 2148022028, // 0x8008370C
      type: "code",
      name: "__osCheckPackId" },
{
      addr: 2148022384, // 0x80083870
      type: "code",
      name: "__osRepairPackId" },
{
      addr: 2148023008, // 0x80083AE0
      type: "code",
      name: "__osPiRawReadIo" },
{
      addr: 2148023088, // 0x80083B30
      type: "code",
      name: "__osPiRawWriteIo" },
{
      addr: 2148023132, // 0x80083B5C
      type: "code",
      name: "__osIdCheckSum" },
{
      addr: 2148023168, // 0x80083B80
      type: "code",
      name: "osEPiWriteIo" },
{
      addr: 2148023200, // 0x80083BA0
      type: "code",
      name: "__osSumcalc" },
{
      addr: 2148023252, // 0x80083BD4
      type: "code",
      name: "__osPfsInodeCacheBank" },
{
      addr: 2148023253, // 0x80083BD5
      type: "code",
      name: "__osPfsInodeCacheChannel" },
{
      addr: 2148023632, // 0x80083D50
      type: "code",
      name: "_Litob" },
{
      addr: 2148024224, // 0x80083FA0
      type: "code",
      name: "_Ldtob" },
{
      addr: 2148025324, // 0x800843EC
      type: "code",
      name: "__xldtob_o_0080" },
{
      addr: 2148025476, // 0x80084484
      type: "code",
      name: "__xldtob_o_0414" },
{
      addr: 2148026928, // 0x80084A30
      type: "code",
      name: "__rmonExecute" },
{
      addr: 2148027072, // 0x80084AC0
      type: "code",
      name: "__rmonWriteWordTo" },
{
      addr: 2148027136, // 0x80084B00
      type: "code",
      name: "__rmonReadWordAt" },
{
      addr: 2148027248, // 0x80084B70
      type: "code",
      name: "__rmonCopyWords" },
{
      addr: 2148027464, // 0x80084C48
      type: "code",
      name: "__rmonGetRegionCount" },
{
      addr: 2148027548, // 0x80084C9C
      type: "code",
      name: "__rmonGetExeName" },
{
      addr: 2148027736, // 0x80084D58
      type: "code",
      name: "__rmonLoadProgram" },
{
      addr: 2148027744, // 0x80084D60
      type: "code",
      name: "__rmonListProcesses" },
{
      addr: 2148027832, // 0x80084DB8
      type: "code",
      name: "__rmonWriteMem" },
{
      addr: 2148028380, // 0x80084FDC
      type: "code",
      name: "__rmonUtilityBuffer" },
{
      addr: 2148028636, // 0x800850DC
      type: "code",
      name: "__rmonReadMem" },
{
      addr: 2148028976, // 0x80085230
      type: "code",
      name: "__rmonSetComm" },
{
      addr: 2148029004, // 0x8008524C
      type: "code",
      name: "__rmonCopyWords" },
{
      addr: 2148029032, // 0x80085268
      type: "code",
      name: "__rmonPanic" },
{
      addr: 2148029040, // 0x80085270
      type: "code",
      name: "__rmonMQ" },
{
      addr: 2148029052, // 0x8008527C
      type: "code",
      name: "__rmonMemcpy" },
{
      addr: 2148029064, // 0x80085288
      type: "code",
      name: "__rmonInit" },
{
      addr: 2148029100, // 0x800852AC
      type: "code",
      name: "__rmonReadWordAt" },
{
      addr: 2148029164, // 0x800852EC
      type: "code",
      name: "__rmonWriteWordTo" },
{
      addr: 2148029272, // 0x80085358
      type: "code",
      name: "__rmonSetFault" },
{
      addr: 2148029312, // 0x80085380
      type: "code",
      name: "__rmonGetRegisterContents" },
{
      addr: 2148029432, // 0x800853F8
      type: "code",
      name: "__rmonSetVRegs" },
{
      addr: 2148029868, // 0x800855AC
      type: "code",
      name: "__rmonGetVRegs" },
{
      addr: 2148030048, // 0x80085660
      type: "code",
      name: "__rmonregs_o_0AA4" },
{
      addr: 2148030340, // 0x80085784
      type: "code",
      name: "__rmonSetSRegs" },
{
      addr: 2148030704, // 0x800858F0
      type: "code",
      name: "__rmonGetSRegs" },
{
      addr: 2148031112, // 0x80085A88
      type: "code",
      name: "__rmonSetFRegisters" },
{
      addr: 2148031252, // 0x80085B14
      type: "code",
      name: "__rmonGetFRegisters" },
{
      addr: 2148031392, // 0x80085BA0
      type: "code",
      name: "__rmonSetGRegisters" },
{
      addr: 2148031632, // 0x80085C90
      type: "code",
      name: "__rmonGetGRegisters" },
{
      addr: 2148031940, // 0x80085DC4
      type: "code",
      name: "__rmonGetRegisterContents" },
{
      addr: 2148032064, // 0x80085E40
      type: "code",
      name: "__rmonMaskIdleThreadInts" },
{
      addr: 2148032168, // 0x80085EA8
      type: "code",
      name: "__rmonGetTCB" },
{
      addr: 2148032268, // 0x80085F0C
      type: "code",
      name: "__rmonStopUserThreads" },
{
      addr: 2148032752, // 0x800860F0
      type: "code",
      name: "__rmonGetThreadStatus" },
{
      addr: 2148034320, // 0x80086710
      type: "code",
      name: "__rmonSendHeader" },
{
      addr: 2148034424, // 0x80086778
      type: "code",
      name: "__rmonSendReply" },
{
      addr: 2148034608, // 0x80086830
      type: "code",
      name: "__rmonSendData" },
{
      addr: 2148035248, // 0x80086AB0
      type: "code",
      name: "__osSpRawReadIo" },
{
      addr: 2148035328, // 0x80086B00
      type: "code",
      name: "__osSpRawWriteIo" },
{
      addr: 2148035408, // 0x80086B50
      type: "code",
      name: "__osSpDeviceBusy" },
{
      addr: 2148035440, // 0x80086B70
      type: "code",
      name: "osStopThread" },
{
      addr: 2148035632, // 0x80086C30
      type: "code",
      name: "__osGetActiveQueue" },
{
      addr: 2148036096, // 0x80086E00
      type: "code",
      name: "__rmonRCPrunning" },
{
      addr: 2148036200, // 0x80086E68
      type: "code",
      name: "__rmonStepRCP" },
{
      addr: 2148036256, // 0x80086EA0
      type: "code",
      name: "__rmonHitCpuFault" },
{
      addr: 2148036300, // 0x80086ECC
      type: "code",
      name: "__rmonRcpAtBreak" },
{
      addr: 2148036301, // 0x80086ECD
      type: "code",
      name: "__rmonHitSpBreak" },
{
      addr: 2148036441, // 0x80086F59
      type: "code",
      name: "__rmonHitBreak" },
{
      addr: 2148036661, // 0x80087035
      type: "code",
      name: "__rmonGetExceptionStatus" },
{
      addr: 2148036721, // 0x80087071
      type: "code",
      name: "__rmonSetSingleStep" },
{
      addr: 2148037149, // 0x8008721D
      type: "code",
      name: "__rmonGetBranchTarget" },
{
      addr: 2148037533, // 0x8008739D
      type: "code",
      name: "__rmonClearBreak" },
{
      addr: 2148037817, // 0x800874B9
      type: "code",
      name: "__rmonListBreak" },
{
      addr: 2148037825, // 0x800874C1
      type: "code",
      name: "__rmonSetBreak" },
{
      addr: 2148040448, // 0x80087F00
      type: "code",
      name: "__divdi3" },
{
      addr: 2148040816, // 0x80088070
      type: "code",
      name: "__udivdi3" },
{
      addr: 2148040848, // 0x80088090
      type: "code",
      name: "__umoddi3" },
{
      addr: 2148047536, // 0x80089AB0
      type: "code",
      name: "midpoint",
      desc: "A0=output_xyz" },
{
      addr: 2148098804, // 0x800962F4
      type: "data",
      name: "overlay_table" },
{
      addr: 2148103760, // 0x80097650
      type: "u32",
      name: "rng_seed" },
{
      addr: 2148146544, // 0x800A1D70
      type: "data",
      name: "generic_save_data_decode_table",
      desc: "44 bytes" },
{
      addr: 2148317348, // 0x800CB8A4
      type: "u32",
      name: "debug_font_color",
      desc: "Used with DrawDebugText" },
{
      addr: 2148320244, // 0x800CC3F4
      type: "u8",
      name: "p1_buttonpress",
      desc: "0x80 (A)" },
{
      addr: 2148320245, // 0x800CC3F5
      type: "u8",
      name: "p1_buttonpress2",
      desc: "0x1 (Right C)" },
{
      addr: 2148320246, // 0x800CC3F6
      type: "u8",
      name: "p1_analog_x_axis" },
{
      addr: 2148320247, // 0x800CC3F7
      type: "u8",
      name: "p1_analog_y_axis" },
{
      addr: 2148320252, // 0x800CC3FC
      type: "u8",
      name: "p2_buttonpress",
      desc: "0x80 (A)" },
{
      addr: 2148320253, // 0x800CC3FD
      type: "u8",
      name: "p2_buttonpress2",
      desc: "0x1 (Right C)" },
{
      addr: 2148320254, // 0x800CC3FE
      type: "u8",
      name: "p2_analog_x_axis" },
{
      addr: 2148320255, // 0x800CC3FF
      type: "u8",
      name: "p2_analog_y_axis" },
{
      addr: 2148320260, // 0x800CC404
      type: "u8",
      name: "p3_buttonpress",
      desc: "0x80 (A)" },
{
      addr: 2148320261, // 0x800CC405
      type: "u8",
      name: "p3_buttonpress2",
      desc: "0x1 (Right C)" },
{
      addr: 2148320262, // 0x800CC406
      type: "u8",
      name: "p3_analog_x_axis" },
{
      addr: 2148320263, // 0x800CC407
      type: "u8",
      name: "p3_analog_y_axis" },
{
      addr: 2148320268, // 0x800CC40C
      type: "u8",
      name: "p4_buttonpress",
      desc: "0x80 (A)" },
{
      addr: 2148320269, // 0x800CC40D
      type: "u8",
      name: "p4_buttonpress2",
      desc: "0x1 (Right C)" },
{
      addr: 2148320270, // 0x800CC40E
      type: "u8",
      name: "p4_analog_x_axis" },
{
      addr: 2148320271, // 0x800CC40F
      type: "u8",
      name: "p4_analog_y_axis" },
{
      addr: 2148320485, // 0x800CC4E5
      type: "u8",
      name: "hidden_block_item_space_index" },
{
      addr: 2148323196, // 0x800CCF7C
      type: "u8",
      name: "p1_buttonpress3",
      desc: "see above" },
{
      addr: 2148323197, // 0x800CCF7D
      type: "u8",
      name: "p1_buttonpress4" },
{
      addr: 2148323198, // 0x800CCF7E
      type: "u8",
      name: "p2_buttonpress3" },
{
      addr: 2148323199, // 0x800CCF7F
      type: "u8",
      name: "p2_buttonpress4" },
{
      addr: 2148323200, // 0x800CCF80
      type: "u8",
      name: "p3_buttonpress3" },
{
      addr: 2148323201, // 0x800CCF81
      type: "u8",
      name: "p3_buttonpress4" },
{
      addr: 2148323202, // 0x800CCF82
      type: "u8",
      name: "p4_buttonpress3" },
{
      addr: 2148323203, // 0x800CCF83
      type: "u8",
      name: "p4_buttonpress4" },
{
      addr: 2148323418, // 0x800CD05A
      type: "u8",
      name: "total_turns" },
{
      addr: 2148323419, // 0x800CD05B
      type: "u8",
      name: "current_turn" },
{
      addr: 2148323420, // 0x800CD05C
      type: "u8",
      name: "current_game_length",
      desc: "00=Lite Play" },
{
      addr: 2148323421, // 0x800CD05D
      type: "u8",
      name: "current_star_spawn",
      desc: "00 for first star spawn" },
{
      addr: 2148323422, // 0x800CD05E
      type: "u8",
      name: "star_spawn_indices",
      desc: "array length 8 of the current star order" },
{
      addr: 2148323431, // 0x800CD067
      type: "u8",
      name: "current_player_index",
      desc: "Player who's turn is active" },
{
      addr: 2148323433, // 0x800CD069
      type: "u8",
      name: "current_space_index" },
{
      addr: 2148323488, // 0x800CD0A0
      type: "u8",
      name: "board_ram9",
      desc: "free for board use" },
{
      addr: 2148323489, // 0x800CD0A1
      type: "u8",
      name: "board_ram10",
      desc: "free for board use" },
{
      addr: 2148323490, // 0x800CD0A2
      type: "u8",
      name: "board_ram11",
      desc: "free for board use" },
{
      addr: 2148323491, // 0x800CD0A3
      type: "u8",
      name: "board_ram12",
      desc: "free for board use" },
{
      addr: 2148323492, // 0x800CD0A4
      type: "u8",
      name: "board_ram13",
      desc: "free for board use" },
{
      addr: 2148323493, // 0x800CD0A5
      type: "u8",
      name: "board_ram14",
      desc: "free for board use" },
{
      addr: 2148323494, // 0x800CD0A6
      type: "u8",
      name: "board_ram15",
      desc: "free for board use" },
{
      addr: 2148323495, // 0x800CD0A7
      type: "u8",
      name: "board_ram16",
      desc: "free for board use" },
{
      addr: 2148323496, // 0x800CD0A8
      type: "u8",
      name: "board_ram17",
      desc: "free for board use" },
{
      addr: 2148323497, // 0x800CD0A9
      type: "u8",
      name: "cur_player_used_item",
      desc: "0=Player can use item" },
{
      addr: 2148323503, // 0x800CD0AF
      type: "u8",
      name: "slow_dice_flags",
      desc: "bit0 is P1" },
{
      addr: 2148323508, // 0x800CD0B4
      type: "u16",
      name: "bank_coin_total",
      desc: "Number of coins in bank" },
{
      addr: 2148327877, // 0x800CE1C5
      type: "u8",
      name: "hidden_block_coins_space_index" },
{
      addr: 2148327938, // 0x800CE202
      type: "u16",
      name: "current_scene" },
{
      addr: 2148339976, // 0x800D1108
      type: "data",
      name: "player_structs" },
{
      addr: 2148339977, // 0x800D1109
      type: "u8",
      name: "p1_cpu_difficulty" },
{
      addr: 2148339978, // 0x800D110A
      type: "u8",
      name: "p1_controller" },
{
      addr: 2148339979, // 0x800D110B
      type: "u8",
      name: "p1_char",
      desc: "Mario=0" },
{
      addr: 2148339986, // 0x800D1112
      type: "u16",
      name: "p1_coins",
      desc: "Player 1 coin count" },
{
      addr: 2148339990, // 0x800D1116
      type: "u8",
      name: "p1_stars",
      desc: "Player 1 star count" },
{
      addr: 2148339991, // 0x800D1117
      type: "u8",
      name: "p1_cur_chain_index",
      desc: "Player 1 current chain index" },
{
      addr: 2148339992, // 0x800D1118
      type: "u8",
      name: "p1_cur_space_index",
      desc: "Player 1 current space index" },
{
      addr: 2148339993, // 0x800D1119
      type: "u8",
      name: "p1_next_chain_index",
      desc: "Player 1 next chain index" },
{
      addr: 2148339994, // 0x800D111A
      type: "u8",
      name: "p1_next_space_index",
      desc: "Player 1 next space index" },
{
      addr: 2148339997, // 0x800D111D
      type: "u8",
      name: "p1_prev_chain_index",
      desc: "Player 1 previous chain index" },
{
      addr: 2148339998, // 0x800D111E
      type: "u8",
      name: "p1_prev_space_index",
      desc: "Player 1 previous space index" },
{
      addr: 2148339999, // 0x800D111F
      type: "u8",
      name: "p1_status_flags",
      desc: "0x80 (reset effect you land)" },
{
      addr: 2148340000, // 0x800D1120
      type: "u8",
      name: "p1_item1",
      desc: "Player 1 first item" },
{
      addr: 2148340001, // 0x800D1121
      type: "u8",
      name: "p1_item2",
      desc: "Player 1 second item" },
{
      addr: 2148340002, // 0x800D1122
      type: "u8",
      name: "p1_item3",
      desc: "Player 1 third item" },
{
      addr: 2148340003, // 0x800D1123
      type: "u8",
      name: "p1_bowser_suit_flag",
      desc: "1 = suit is on" },
{
      addr: 2148340004, // 0x800D1124
      type: "u8",
      name: "p1_turn_color_status",
      desc: "00=blank" },
{
      addr: 2148340016, // 0x800D1130
      type: "u16",
      name: "p1_minigame_star" },
{
      addr: 2148340018, // 0x800D1132
      type: "u16",
      name: "p1_coin_star" },
{
      addr: 2148340020, // 0x800D1134
      type: "s8",
      name: "p1_happening_space_count" },
{
      addr: 2148340021, // 0x800D1135
      type: "u8",
      name: "p1_red_space_count" },
{
      addr: 2148340022, // 0x800D1136
      type: "u8",
      name: "p1_blue_space_count" },
{
      addr: 2148340023, // 0x800D1137
      type: "u8",
      name: "p1_chance_space_count" },
{
      addr: 2148340024, // 0x800D1138
      type: "u8",
      name: "p1_bowser_space_count" },
{
      addr: 2148340025, // 0x800D1139
      type: "u8",
      name: "p1_battle_space_count" },
{
      addr: 2148340026, // 0x800D113A
      type: "u8",
      name: "p1_item_space_count" },
{
      addr: 2148340027, // 0x800D113B
      type: "u8",
      name: "p1_bank_space_count" },
{
      addr: 2148340028, // 0x800D113C
      type: "u8",
      name: "p1_game_guy_space_count" },
{
      addr: 2148340033, // 0x800D1141
      type: "u8",
      name: "p2_cpu_difficulty" },
{
      addr: 2148340034, // 0x800D1142
      type: "u8",
      name: "p2_controller" },
{
      addr: 2148340035, // 0x800D1143
      type: "u8",
      name: "p2_char" },
{
      addr: 2148340042, // 0x800D114A
      type: "u16",
      name: "p2_coins",
      desc: "Player 2 coin count" },
{
      addr: 2148340046, // 0x800D114E
      type: "u8",
      name: "p2_stars",
      desc: "Player 2 star count" },
{
      addr: 2148340047, // 0x800D114F
      type: "u8",
      name: "p2_cur_chain_index",
      desc: "Player 2 current chain index" },
{
      addr: 2148340048, // 0x800D1150
      type: "u8",
      name: "p2_cur_space_index",
      desc: "Player 2 current space index" },
{
      addr: 2148340049, // 0x800D1151
      type: "u8",
      name: "p2_next_chain_index",
      desc: "Player 2 next chain index" },
{
      addr: 2148340050, // 0x800D1152
      type: "u8",
      name: "p2_next_space_index",
      desc: "Player 2 next space index" },
{
      addr: 2148340053, // 0x800D1155
      type: "u8",
      name: "p2_prev_chain_index",
      desc: "Player 2 previous chain index" },
{
      addr: 2148340054, // 0x800D1156
      type: "u8",
      name: "p2_prev_space_index",
      desc: "Player 2 previous space index" },
{
      addr: 2148340055, // 0x800D1157
      type: "u8",
      name: "p2_status_flags",
      desc: "see p1 notes" },
{
      addr: 2148340056, // 0x800D1158
      type: "u8",
      name: "p2_item1",
      desc: "Player 2 first item" },
{
      addr: 2148340057, // 0x800D1159
      type: "u8",
      name: "p2_item2",
      desc: "Player 2 second item" },
{
      addr: 2148340058, // 0x800D115A
      type: "u8",
      name: "p2_item3",
      desc: "Player 2 third item" },
{
      addr: 2148340059, // 0x800D115B
      type: "u8",
      name: "p2_bowser_suit_flag",
      desc: "1 = suit is on" },
{
      addr: 2148340060, // 0x800D115C
      type: "u8",
      name: "p2_turn_color_status",
      desc: "00=blank" },
{
      addr: 2148340072, // 0x800D1168
      type: "u16",
      name: "p2_minigame_star" },
{
      addr: 2148340074, // 0x800D116A
      type: "u16",
      name: "p2_coin_star" },
{
      addr: 2148340076, // 0x800D116C
      type: "s8",
      name: "p2_happening_space_count" },
{
      addr: 2148340077, // 0x800D116D
      type: "u8",
      name: "p2_red_space_count" },
{
      addr: 2148340078, // 0x800D116E
      type: "u8",
      name: "p2_blue_space_count" },
{
      addr: 2148340079, // 0x800D116F
      type: "u8",
      name: "p2_chance_space_count" },
{
      addr: 2148340080, // 0x800D1170
      type: "u8",
      name: "p2_bowser_space_count" },
{
      addr: 2148340081, // 0x800D1171
      type: "u8",
      name: "p2_battle_space_count" },
{
      addr: 2148340082, // 0x800D1172
      type: "u8",
      name: "p2_item_space_count" },
{
      addr: 2148340083, // 0x800D1173
      type: "u8",
      name: "p2_bank_space_count" },
{
      addr: 2148340084, // 0x800D1174
      type: "u8",
      name: "p2_game_guy_space_count" },
{
      addr: 2148340089, // 0x800D1179
      type: "u8",
      name: "p3_cpu_difficulty" },
{
      addr: 2148340090, // 0x800D117A
      type: "u8",
      name: "p3_controller" },
{
      addr: 2148340091, // 0x800D117B
      type: "u8",
      name: "p3_char" },
{
      addr: 2148340098, // 0x800D1182
      type: "u16",
      name: "p3_coins",
      desc: "Player 3 coin count" },
{
      addr: 2148340102, // 0x800D1186
      type: "u8",
      name: "p3_stars",
      desc: "Player 3 star count" },
{
      addr: 2148340103, // 0x800D1187
      type: "u8",
      name: "p3_cur_chain_index",
      desc: "Player 3 current chain index" },
{
      addr: 2148340104, // 0x800D1188
      type: "u8",
      name: "p3_cur_space_index",
      desc: "Player 3 current space index" },
{
      addr: 2148340105, // 0x800D1189
      type: "u8",
      name: "p3_next_chain_index",
      desc: "Player 3 next chain index" },
{
      addr: 2148340106, // 0x800D118A
      type: "u8",
      name: "p3_next_space_index",
      desc: "Player 3 next space index" },
{
      addr: 2148340109, // 0x800D118D
      type: "u8",
      name: "p3_prev_chain_index",
      desc: "Player 3 previous chain index" },
{
      addr: 2148340110, // 0x800D118E
      type: "u8",
      name: "p3_prev_space_index",
      desc: "Player 3 previous space index" },
{
      addr: 2148340111, // 0x800D118F
      type: "u8",
      name: "p3_status_flags",
      desc: "see p1 notes" },
{
      addr: 2148340112, // 0x800D1190
      type: "u8",
      name: "p3_item1",
      desc: "Player 3 first item" },
{
      addr: 2148340113, // 0x800D1191
      type: "u8",
      name: "p3_item2",
      desc: "Player 3 second item" },
{
      addr: 2148340114, // 0x800D1192
      type: "u8",
      name: "p3_item3",
      desc: "Player 3 third item" },
{
      addr: 2148340115, // 0x800D1193
      type: "u8",
      name: "p3_bowser_suit_flag",
      desc: "1 = suit is on" },
{
      addr: 2148340116, // 0x800D1194
      type: "u8",
      name: "p3_turn_color_status",
      desc: "00=blank" },
{
      addr: 2148340128, // 0x800D11A0
      type: "u16",
      name: "p3_minigame_star" },
{
      addr: 2148340130, // 0x800D11A2
      type: "u16",
      name: "p3_coin_star" },
{
      addr: 2148340132, // 0x800D11A4
      type: "s8",
      name: "p3_happening_space_count" },
{
      addr: 2148340133, // 0x800D11A5
      type: "u8",
      name: "p3_red_space_count" },
{
      addr: 2148340134, // 0x800D11A6
      type: "u8",
      name: "p3_blue_space_count" },
{
      addr: 2148340135, // 0x800D11A7
      type: "u8",
      name: "p3_chance_space_count" },
{
      addr: 2148340136, // 0x800D11A8
      type: "u8",
      name: "p3_bowser_space_count" },
{
      addr: 2148340137, // 0x800D11A9
      type: "u8",
      name: "p3_battle_space_count" },
{
      addr: 2148340138, // 0x800D11AA
      type: "u8",
      name: "p3_item_space_count" },
{
      addr: 2148340139, // 0x800D11AB
      type: "u8",
      name: "p3_bank_space_count" },
{
      addr: 2148340140, // 0x800D11AC
      type: "u8",
      name: "p3_game_guy_space_count" },
{
      addr: 2148340145, // 0x800D11B1
      type: "u8",
      name: "p4_cpu_difficulty" },
{
      addr: 2148340146, // 0x800D11B2
      type: "u8",
      name: "p4_controller" },
{
      addr: 2148340147, // 0x800D11B3
      type: "u8",
      name: "p4_char" },
{
      addr: 2148340154, // 0x800D11BA
      type: "u16",
      name: "p4_coins",
      desc: "Player 4 coin count" },
{
      addr: 2148340158, // 0x800D11BE
      type: "u8",
      name: "p4_stars",
      desc: "Player 4 star count" },
{
      addr: 2148340159, // 0x800D11BF
      type: "u8",
      name: "p4_cur_chain_index",
      desc: "Player 4 current chain index" },
{
      addr: 2148340160, // 0x800D11C0
      type: "u8",
      name: "p4_cur_space_index",
      desc: "Player 4 current space index" },
{
      addr: 2148340161, // 0x800D11C1
      type: "u8",
      name: "p4_next_chain_index",
      desc: "Player 4 next chain index" },
{
      addr: 2148340162, // 0x800D11C2
      type: "u8",
      name: "p4_next_space_index",
      desc: "Player 4 next space index" },
{
      addr: 2148340165, // 0x800D11C5
      type: "u8",
      name: "p4_prev_chain_index",
      desc: "Player 4 previous chain index" },
{
      addr: 2148340166, // 0x800D11C6
      type: "u8",
      name: "p4_prev_space_index",
      desc: "Player 4 previous space index" },
{
      addr: 2148340167, // 0x800D11C7
      type: "u8",
      name: "p4_status_flags",
      desc: "see p1 notes" },
{
      addr: 2148340168, // 0x800D11C8
      type: "u8",
      name: "p4_item1",
      desc: "Player 4 first item" },
{
      addr: 2148340169, // 0x800D11C9
      type: "u8",
      name: "p4_item2",
      desc: "Player 4 second item" },
{
      addr: 2148340170, // 0x800D11CA
      type: "u8",
      name: "p4_item3",
      desc: "Player 4 third item" },
{
      addr: 2148340171, // 0x800D11CB
      type: "u8",
      name: "p4_bowser_suit_flag",
      desc: "1 = suit is on" },
{
      addr: 2148340172, // 0x800D11CC
      type: "u8",
      name: "p4_turn_color_status",
      desc: "00=blank" },
{
      addr: 2148340184, // 0x800D11D8
      type: "u16",
      name: "p4_minigame_star" },
{
      addr: 2148340186, // 0x800D11DA
      type: "u16",
      name: "p4_coin_star" },
{
      addr: 2148340188, // 0x800D11DC
      type: "s8",
      name: "p4_happening_space_count" },
{
      addr: 2148340189, // 0x800D11DD
      type: "u8",
      name: "p4_red_space_count" },
{
      addr: 2148340190, // 0x800D11DE
      type: "u8",
      name: "p4_blue_space_count" },
{
      addr: 2148340191, // 0x800D11DF
      type: "u8",
      name: "p4_chance_space_count" },
{
      addr: 2148340192, // 0x800D11E0
      type: "u8",
      name: "p4_bowser_space_count" },
{
      addr: 2148340193, // 0x800D11E1
      type: "u8",
      name: "p4_battle_space_count" },
{
      addr: 2148340194, // 0x800D11E2
      type: "u8",
      name: "p4_item_space_count" },
{
      addr: 2148340195, // 0x800D11E3
      type: "u8",
      name: "p4_bank_space_count" },
{
      addr: 2148340196, // 0x800D11E4
      type: "u8",
      name: "p4_game_guy_space_count" },
{
      addr: 2148340303, // 0x800D124F
      type: "u8",
      name: "hidden_block_star_space_index" },
{
      addr: 2148352448, // 0x800D41C0
      type: "u32",
      name: "cur_player_spaces_remaining" },
{
      addr: 2148376976, // 0x800DA190
      type: "code",
      name: "RunDecisionTree",
      desc: "A0=decision_tree_pointer" },
{
      addr: 2148409160, // 0x800E1F48
      type: "code",
      name: "ShowPlayerCoinChange",
      desc: "A0=player_index" },
{
      addr: 2148419960, // 0x800E4978
      type: "code",
      name: "PlayerHasItem",
      desc: "A0=player_index" },
{
      addr: 2148420060, // 0x800E49DC
      type: "code",
      name: "PlayerHasEmptyItemSlot",
      desc: "A0=player_index" },
{
      addr: 2148420104, // 0x800E4A08
      type: "code",
      name: "FixUpPlayerItemSlots",
      desc: "A0=player_index" },
{
      addr: 2148443744, // 0x800EA660
      type: "code",
      name: "AddArrowAngle",
      desc: "F0=degree_rot_of_arrow" },
{
      addr: 2148446560, // 0x800EB160
      type: "code",
      name: "GetSpaceData",
      desc: "A0=space_index" },
{
      addr: 2148446596, // 0x800EB184
      type: "code",
      name: "GetAbsSpaceIndexFromChainSpaceIndex",
      desc: "A0=chain_index" },
{
      addr: 2148446640, // 0x800EB1B0
      type: "code",
      name: "GetChainLength",
      desc: "A0=chain_index" },
{
      addr: 2148446668, // 0x800EB1CC
      type: "code",
      name: "GetChainSpaceIndexFromAbsSpaceIndex",
      desc: "A0=abs_space_index" },
{
      addr: 2148446796, // 0x800EB24C
      type: "code",
      name: "SetPlayerOntoAbsSpaceIndex",
      desc: "A0=abs_space_index" },
{
      addr: 2148448240, // 0x800EB7F0
      type: "code",
      name: "SetSpaceType",
      desc: "A0=space_index" },
{
      addr: 2148448864, // 0x800EBA60
      type: "code",
      name: "EventTableHydrate",
      desc: "Moves event table data into the space data" },
{
      addr: 2148449468, // 0x800EBCBC
      type: "code",
      name: "SetCurrentSpaceIndex",
      desc: "A0=space_index" },
{
      addr: 2148449480, // 0x800EBCC8
      type: "code",
      name: "GetCurrentSpaceIndex" },
{
      addr: 2148449708, // 0x800EBDAC
      type: "code",
      name: "RedrawSpaces" },
{
      addr: 2148452040, // 0x800EC6C8
      type: "code",
      name: "CloseMessage",
      desc: "Closes open message window (with animation)" },
{
      addr: 2148452588, // 0x800EC8EC
      type: "code",
      name: "ShowMessage",
      desc: "A0=character_index" },
{
      addr: 2148453208, // 0x800ECB58
      type: "code",
      name: "GetAngleBetweenSpaces",
      desc: "A0=space_1_data[0x8]" },
{
      addr: 2148453916, // 0x800ECE1C
      type: "code",
      name: "SetPlayerBlue",
      desc: "Sets the player's turn state blue" },
{
      addr: 2148453924, // 0x800ECE24
      type: "code",
      name: "SetPlayerRed",
      desc: "Sets the player's turn state red" },
{
      addr: 2148453932, // 0x800ECE2C
      type: "code",
      name: "SetPlayerGreen",
      desc: "Sets the player's turn state green" },
{
      addr: 2148453964, // 0x800ECE4C
      type: "code",
      name: "GetSumOfPlayerStars",
      desc: "sums the star count of all players" },
{
      addr: 2148454044, // 0x800ECE9C
      type: "code",
      name: "RNGPercentChance",
      desc: "A0=percent_chance" },
{
      addr: 2148454116, // 0x800ECEE4
      type: "code",
      name: "GetTurnsElapsed" },
{
      addr: 2148454924, // 0x800ED20C
      type: "code",
      name: "RotatePlayerModel",
      desc: "A0=player_index" },
{
      addr: 2148456732, // 0x800ED91C
      type: "code",
      name: "SetPlayerOntoChain",
      desc: "A0=player_index" },
{
      addr: 2148456856, // 0x800ED998
      type: "code",
      name: "SetNextChainAndSpace",
      desc: "A0=player_index" },
{
      addr: 2148456952, // 0x800ED9F8
      type: "code",
      name: "SetPrevChainAndSpace",
      desc: "A0=player_index" },
{
      addr: 2148457048, // 0x800EDA58
      type: "code",
      name: "ChangeStarLocation" },
{
      addr: 2148460992, // 0x800EE9C0
      type: "code",
      name: "GetPlayerPlacement",
      desc: "A0=player_index" },
{
      addr: 2148461144, // 0x800EEA58
      type: "code",
      name: "GetPlayerPlacementAtEndOfGame",
      desc: "A0=player_index" },
{
      addr: 2148475184, // 0x800F2130
      type: "code",
      name: "GetCurrentPlayerIndex" },
{
      addr: 2148475196, // 0x800F213C
      type: "code",
      name: "GetPlayerStruct",
      desc: "A0=player_index pass -1 to get current player's struct" },
{
      addr: 2148475260, // 0x800F217C
      type: "code",
      name: "PlayerIsCurrent",
      desc: "A0=player_index tests if A0 is the current player" },
{
      addr: 2148475288, // 0x800F2198
      type: "code",
      name: "PlayerIsCPU",
      desc: "A0=player_index" },
{
      addr: 2148475328, // 0x800F21C0
      type: "code",
      name: "AdjustPlayerCoins",
      desc: "A0=player_index" },
{
      addr: 2148475440, // 0x800F2230
      type: "code",
      name: "PlayerHasCoins",
      desc: "A0=player_index" },
{
      addr: 2148475652, // 0x800F2304
      type: "code",
      name: "SetBoardPlayerAnimation",
      desc: "A0=player_index" },
{
      addr: 2148490564, // 0x800F5D44
      type: "code",
      name: "AdjustPlayerCoinsGradual",
      desc: "A0=player_index" },
{
      addr: 2148492272, // 0x800F63F0
      type: "code",
      name: "RefreshHUD",
      desc: "A0=player_index" },
{
      addr: 2148535712, // 0x80100DA0
      type: "data",
      name: "mini_ids_4p" },
{
      addr: 2148535732, // 0x80100DB4
      type: "data",
      name: "mini_ids_4p_easy" },
{
      addr: 2148535744, // 0x80100DC0
      type: "data",
      name: "mini_ids_1v3" },
{
      addr: 2148535756, // 0x80100DCC
      type: "data",
      name: "mini_ids_1v3_easy" },
{
      addr: 2148535764, // 0x80100DD4
      type: "data",
      name: "mini_ids_2v2" },
{
      addr: 2148535776, // 0x80100DE0
      type: "data",
      name: "mini_ids_2v2_easy" },
{
      addr: 2148535784, // 0x80100DE8
      type: "data",
      name: "mini_ids_battle" },
{
      addr: 2148535792, // 0x80100DF0
      type: "data",
      name: "mini_ids_battle_easy" },
{
      addr: 2148535796, // 0x80100DF4
      type: "data",
      name: "mini_ids_item" },
{
      addr: 2148535804, // 0x80100DFC
      type: "data",
      name: "mini_ids_item_easy" },
{
      addr: 2148535816, // 0x80100E08
      type: "data",
      name: "mini_ids_duel" },
{
      addr: 2148535824, // 0x80100E10
      type: "data",
      name: "mini_ids_duel_easy" },
{
      addr: 2148535832, // 0x80100E18
      type: "data",
      name: "num_minis_in_roulette",
      desc: "Number of Mini-Games to populate the roulette with for each type (4p" },
{
      addr: 2148553232, // 0x80105210
      type: "u16",
      name: "num_board_spaces" },
{
      addr: 2148553234, // 0x80105212
      type: "u16",
      name: "num_chains" },
{
      addr: 2148553236, // 0x80105214
      type: "u32",
      name: "hydrated_space_data" },
{
      addr: 2148553240, // 0x80105218
      type: "u32",
      name: "hydrated_chains" },
{
      addr: 2148553360, // 0x80105290
      type: "data",
      name: "arrow_angles",
      desc: "f32[8]" },
{
      addr: 2148553392, // 0x801052B0
      type: "u32",
      name: "num_arrow_angles" },
{
      addr: 2148555168, // 0x801059A0
      type: "data",
      name: "overlay_base",
      desc: "Overlay starting location" }
];
