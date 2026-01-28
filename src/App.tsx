import { useEffect, useState } from 'react'
import { CardFsErrorCode, CardSdk, getKeyFromBlob, type CardEventHandler, type CardFsErrorPayload, type CardFsReadHandler, type CardFsReadResult } from 'dome-embedded-app-sdk';
import './App.css'

type JournalData = {
    text: string;
    updatedAt: string | null;
    };

 const emptyJournal: JournalData = {
    text: "",
    updatedAt: null 
  };

function App() {
   // User object state
   const [user, setUser] = useState<any>(null);
   // store the SDK state to access it later
   const [sdk, setSdk] = useState<CardSdk | null>(null);
   const [initError, setInitError] = useState<any>(null);
   const journalDoc = "journal.json";
   const [initData, setInitData] = useState<any>(null);
   const [journal, setJournal] = useState<JournalData | null>(null);
  const [isSaving, setIsSaving] = useState<any>(null);
   const loadJournal = (sdkInstance: CardSdk) => {
    // Read the file
    const readHandler: CardFsReadHandler = {
      next: (payload: CardFsReadResult) => {
        const { data } = payload;
        if (data && typeof data === "object") {
          const finalData: JournalData = {
            text: typeof data.text === "string" ? data.text : "",
            updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
          };
          setJournal(finalData);
          return;
        }

        const finalData: JournalData = {
          text: typeof data === "string" ? data : "",
          updatedAt: null,
        };
        setJournal(finalData);
      },
      error: (error: CardFsErrorPayload) => {
        if (error.code !== CardFsErrorCode.NOT_FOUND) {
          console.error("Error reading file", error);
          return;
        }

        setJournal(emptyJournal);
        sdkInstance.cardFS.write(journalDoc, emptyJournal).catch((err) => {
          console.error("Error creating journal", err);
        });
      }
    };

    sdkInstance.cardFS.read(journalDoc, readHandler, false);
   };

   const saveJournal = async (nextJournal: JournalData) => {
    if (!sdk) {
      console.error("SDK not initialized");
      return;
    }

    setIsSaving(true);
    try {
      await sdk.cardFS.write(journalDoc, nextJournal);
    } catch (error) {
      console.error("Error writing journal", error);
    } finally {
      setIsSaving(false);
    }
   };
   
   useEffect(() => {
     // decryption blob for the card shared with devs goes here
     const reactStarterDecBlob = {"v":1,"seed":170,"obf":[159,203,131,140,165,183,81,88,71,22,21,63,49,232,160,241,195,168,165,131,189,73,122,67,3,25,49,69,247,250,155,209,243,154,212,139,89,69,85,7,49,15,3,201,236,145,224,131,140,188]};

     // Handle dome card events
     const eventHandler: CardEventHandler = {
      // here you will recieve the init data with user info, theme, permissions etc.
       onInit: (data: any) => {
         setUser(data?.user);
         console.log("onInit called");
         setInitData(data);
       },
       // onInitError will return an error object with message and error_code if initialization failsx
       onInitError: (data: any) => {
        setInitError(data);
       },
       onError: (data: { message: string; error_code: string | number; }) => {
         console.error("Some Error", `${data.message} (${data.error_code})`);
       },
     };

     // Initialize card with secret code and event handler
     CardSdk.init(getKeyFromBlob(reactStarterDecBlob), eventHandler)
       .then((sdk) => {
        setSdk(sdk);
        console.debug("React Starter initialized");
       })
       .catch((err) => {
         console.error("Init failed", err);
       });
   }, []);

   useEffect(() => {
      if (sdk && initData) {

        loadJournal(sdk);
      }
   }, [sdk, initData]);


   return (
     <div className="main">
       {initError ? (
         <>
          <h3>Initialization Failed</h3>
          <p>{initError.message} {initError.error_code}</p>
         </>
        ) : !user ? (
          <p>Loading...</p>
        ) : (
          <>
            <h1>
              Journal for {user.name?.given} {user.name?.family}
            </h1>
            {journal ? (
              <>
                <textarea
                  value={journal.text}
                  onChange={(event) => {
                    setJournal((prev) => ({
                      text: event.target.value,
                      updatedAt: prev?.updatedAt ?? null,
                    }));
                  }}
                  placeholder="Write your journal entry..."
                  rows={12}
                />
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => {
                      const nextJournal = {
                        text: journal.text,
                        updatedAt: new Date().toISOString(),
                      };
                      setJournal(nextJournal);
                      void saveJournal(nextJournal);
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Journal"}
                  </button>
                  {journal.updatedAt ? (
                    <span className="meta">Last saved {new Date(journal.updatedAt).toLocaleString()}</span>
                  ) : (
                    <span className="meta">Not saved yet</span>
                  )}
                </div>
              </>
            ) : (
              <p>Loading journal...</p>
            )}
          </>
        )}
     </div>
   );
}

export default App