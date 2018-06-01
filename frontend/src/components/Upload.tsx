import * as firebase from "firebase"
import * as React from "react"
import Dropzone from "react-dropzone"
import { Link } from "react-router-dom"
import { Progress } from "react-sweet-progress"
import "react-sweet-progress/lib/style.css"
import { Status } from "../enums"
import firebaseApp from "../firebaseApp"

interface IState {
  file?: File
  dropzoneMessage: string
  languageCode: string
  uploadProgress: number
}

class Upload extends React.Component<any, IState> {
  constructor(props: any) {
    super(props)

    this.state = {
      dropzoneMessage: "Klikk for å velge, eller slipp lydfil her",
      file: undefined,
      languageCode: "nb-NO",
      uploadProgress: 0
    }
  }

  public handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    this.setState({ languageCode: event.target.value })
  }
  public handleFileDrop = (acceptedFiles: [File], rejectedFiles: [File]) => {
    if (rejectedFiles.length > 0) {
      this.setState({ dropzoneMessage: "Filen har feil format" })
    } else {
      // Take the first file
      const [file] = acceptedFiles
      this.setState({ file, dropzoneMessage: file.name })
    }
  }

  public handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { file, languageCode } = this.state

    if (file === undefined) {
      return
    }

    console.log(file)

    const id = firebaseApp.db.ref(`/transcripts/`).push().key

    if (id === null) {
      return
    }

    const metadata = {
      contentType: file.type,
      customMetadata: {
        languageCode
      }
    }

    const uploadTask = firebaseApp.storage
      .ref()
      .child(id)
      .put(file, metadata)

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot: firebase.storage.UploadTaskSnapshot) => {
        const uploadProgress = Math.round(
          snapshot.bytesTransferred / snapshot.totalBytes * 100
        )
        this.setState({ uploadProgress })
      },
      error => {
        console.error(error)
        /*FIXME https://firebase.google.com/docs/storage/web/handle-errors
        
        switch (error.code) {
          case "storage/unauthorized":
            // User doesn't have permission to access the object
            break
          case "storage/canceled":
            // User canceled the upload
            break
          case "storage/unknown":
            // Unknown error occurred, inspect error.serverResponse
            console.error(error)
            console.log("error during upload from error section")
            break
        }*/
      },
      () => {
        console.log("doing firebase stuff")
        console.log(id)

        uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
          firebaseApp.db
            .ref(`/transcripts/${id}`)
            .set({
              audioFile: {
                languageCode,
                name: file.name,
                url: downloadURL
              },
              progress: { status: Status.Uploaded },
              timestamps: {
                uploadedAt: firebase.database.ServerValue.TIMESTAMP
              }
            })

            .then(success => {
              this.props.history.push(`/${id}`)
            })
            .catch(error => {
              console.log("error during upload")
              console.error(error)
            })
        })
      }
    )
  }

  public render() {
    if (this.state.uploadProgress === 0) {
      return (
        <div className="wrapper">
          <form className="dropForm" onSubmit={this.handleSubmit}>
            <p>Last opp lydfil</p>

            <Dropzone
              accept="audio/*"
              style={{
                border: "10px solid #f6f6f6",
                borderRadius: "50%",
                height: "132px",
                width: "132px"
              }}
              onDrop={this.handleFileDrop}
            >
              <div
                style={{
                  marginTop: "50%",
                  padding: "0 10px",
                  textAlign: "center",
                  transform: "translateY(-50%)"
                }}
              >
                {this.state.dropzoneMessage}
              </div>
            </Dropzone>
            <select
              value={this.state.languageCode}
              onChange={this.handleLanguageChange}
            >
              <option value="nb-NO">Norsk</option>
              <option value="en-US">Engelsk</option>
            </select>
            <button
              className="nrk-button"
              disabled={this.state.file == null}
              type="submit"
            >
              Last opp
            </button>
          </form>
          <Link to="/changelog"> Endringslogg</Link>
        </div>
      )
    }

    const status = this.state.uploadProgress < 100 ? "active" : "success"
    return (
      <div className="wrapper">
        <div className="dropForm">
          <p>Laster opp</p>
          <Progress
            type="circle"
            percent={this.state.uploadProgress}
            status={status}
          />
        </div>
      </div>
    )
  }
}

export default Upload